import { promises as fs } from 'fs';
import * as path from 'path';
import { log } from '@shared/utils/logger';

export interface PermissionCheckResult {
  canRead: boolean;
  canWrite: boolean;
  exists: boolean;
  error?: string;
}

export interface DirectoryPermissions {
  path: string;
  readable: boolean;
  writable: boolean;
  exists: boolean;
  error?: string;
}

export class FileSystemPermissionService {
  
  /**
   * Check if a specific file/directory has read and write permissions
   */
  async checkPermissions(filePath: string): Promise<PermissionCheckResult> {
    try {
      // Check if path exists
      let exists = false;
      try {
        await fs.access(filePath);
        exists = true;
      } catch {
        exists = false;
      }

      if (!exists) {
        return {
          canRead: false,
          canWrite: false,
          exists: false,
          error: 'Path does not exist'
        };
      }

      // Check read permission
      let canRead = false;
      try {
        await fs.access(filePath, fs.constants.R_OK);
        canRead = true;
      } catch {
        canRead = false;
      }

      // Check write permission
      let canWrite = false;
      try {
        await fs.access(filePath, fs.constants.W_OK);
        canWrite = true;
      } catch {
        canWrite = false;
      }

      return {
        canRead,
        canWrite,
        exists,
      };

    } catch (error) {
      log.error('Failed to check file permissions', error as Error, 'FileSystemPermissions');
      return {
        canRead: false,
        canWrite: false,
        exists: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Check permissions for multiple critical directories
   */
  async checkCriticalDirectories(userDataPath: string): Promise<DirectoryPermissions[]> {
    const criticalPaths = [
      userDataPath, // App data directory
      path.join(userDataPath, 'exports'), // Export directory
      path.dirname(userDataPath), // Parent directory
      path.join(require('os').homedir(), '.claude'), // Claude CLI directory
      path.join(require('os').homedir(), '.claude', 'projects'), // Claude projects directory
    ];

    const results: DirectoryPermissions[] = [];

    for (const dirPath of criticalPaths) {
      try {
        const result = await this.checkPermissions(dirPath);
        results.push({
          path: dirPath,
          readable: result.canRead,
          writable: result.canWrite,
          exists: result.exists,
          error: result.error
        });
      } catch (error) {
        results.push({
          path: dirPath,
          readable: false,
          writable: false,
          exists: false,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Attempt to create a directory with proper error handling
   */
  async ensureDirectoryExists(dirPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if directory already exists
      const permissions = await this.checkPermissions(dirPath);
      if (permissions.exists) {
        return { success: true };
      }

      // Try to create the directory
      await fs.mkdir(dirPath, { recursive: true });
      
      // Verify it was created successfully
      const verifyPermissions = await this.checkPermissions(dirPath);
      if (!verifyPermissions.exists) {
        return { 
          success: false, 
          error: 'Directory was not created successfully' 
        };
      }

      log.info(`Successfully created directory: ${dirPath}`, 'FileSystemPermissions');
      return { success: true };

    } catch (error) {
      const errorMessage = `Failed to create directory ${dirPath}: ${(error as Error).message}`;
      log.error(errorMessage, error as Error, 'FileSystemPermissions');
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Check if the Claude CLI directory structure exists and is accessible
   */
  async validateClaudeCliAccess(): Promise<{
    claudeDir: PermissionCheckResult;
    projectsDir: PermissionCheckResult;
    recommendations: string[];
  }> {
    const claudeDir = path.join(require('os').homedir(), '.claude');
    const projectsDir = path.join(claudeDir, 'projects');

    const claudeDirResult = await this.checkPermissions(claudeDir);
    const projectsDirResult = await this.checkPermissions(projectsDir);

    const recommendations: string[] = [];

    if (!claudeDirResult.exists) {
      recommendations.push('Claude CLI has not been run yet. Please run Claude CLI at least once to create the necessary directory structure.');
    } else if (!claudeDirResult.canRead) {
      recommendations.push('Cannot read Claude CLI directory. Please check file permissions for ~/.claude');
    }

    if (!projectsDirResult.exists) {
      recommendations.push('Claude CLI projects directory does not exist. Run Claude CLI in a project to create this directory.');
    } else if (!projectsDirResult.canRead) {
      recommendations.push('Cannot read Claude CLI projects directory. Please check file permissions for ~/.claude/projects');
    }

    return {
      claudeDir: claudeDirResult,
      projectsDir: projectsDirResult,
      recommendations
    };
  }

  /**
   * Test file operations in a directory
   */
  async testFileOperations(dirPath: string): Promise<{
    canCreateFile: boolean;
    canReadFile: boolean;
    canDeleteFile: boolean;
    error?: string;
  }> {
    const testFilePath = path.join(dirPath, '.cctracker-permission-test');
    
    try {
      // Test file creation and writing
      await fs.writeFile(testFilePath, 'test', 'utf8');
      
      // Test file reading
      const content = await fs.readFile(testFilePath, 'utf8');
      const canRead = content === 'test';
      
      // Test file deletion
      await fs.unlink(testFilePath);
      
      return {
        canCreateFile: true,
        canReadFile: canRead,
        canDeleteFile: true
      };
      
    } catch (error) {
      // Clean up test file if it exists
      try {
        await fs.unlink(testFilePath);
      } catch {
        // Ignore cleanup errors
      }
      
      return {
        canCreateFile: false,
        canReadFile: false,
        canDeleteFile: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get comprehensive file system health report
   */
  async getFileSystemHealthReport(userDataPath: string): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    directories: DirectoryPermissions[];
    claudeAccess: {
      claudeDir: PermissionCheckResult;
      projectsDir: PermissionCheckResult;
      recommendations: string[];
    };
    recommendations: string[];
  }> {
    const directories = await this.checkCriticalDirectories(userDataPath);
    const claudeAccess = await this.validateClaudeCliAccess();
    
    const recommendations: string[] = [...claudeAccess.recommendations];
    let criticalIssues = 0;
    let warnings = 0;

    // Analyze directory permissions
    for (const dir of directories) {
      if (!dir.exists && dir.path.includes('.claude')) {
        // Claude directories not existing is expected if CLI hasn't been run
        warnings++;
      } else if (!dir.exists || !dir.readable || !dir.writable) {
        if (dir.path === userDataPath) {
          criticalIssues++;
          recommendations.push(`Critical: Cannot access app data directory ${dir.path}`);
        } else {
          warnings++;
          recommendations.push(`Warning: Limited access to ${dir.path}`);
        }
      }
    }

    let overall: 'healthy' | 'warning' | 'critical';
    if (criticalIssues > 0) {
      overall = 'critical';
    } else if (warnings > 0) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      directories,
      claudeAccess,
      recommendations
    };
  }
}

export const fileSystemPermissionService = new FileSystemPermissionService();