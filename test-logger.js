// Quick test for the logging utility
const { log } = require('./dist/main/shared/utils/logger.js');

console.log('Testing logging utility...');

// Test different log levels
log.debug('This is a debug message', 'Test');
log.info('This is an info message', 'Test'); 
log.warn('This is a warning message', 'Test');
log.error('This is an error message', new Error('Test error'), 'Test');

// Test convenience methods
log.service.start('TestService');
log.ipc.call('test-channel', { data: 'test' });
log.component.render('TestComponent');

console.log('Logging test completed');