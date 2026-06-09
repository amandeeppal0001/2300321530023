class Logger {
    static info(message: string, ...args: any[]) {
        if (typeof window !== 'undefined') {
            const logs = (window as any)._customLogs || [];
            logs.push({ level: 'info', message, args, timestamp: new Date().toISOString() });
            (window as any)._customLogs = logs;
        }
    }

    static error(message: string, ...args: any[]) {
        if (typeof window !== 'undefined') {
            const logs = (window as any)._customLogs || [];
            logs.push({ level: 'error', message, args, timestamp: new Date().toISOString() });
            (window as any)._customLogs = logs;
        }
    }
    
    static warn(message: string, ...args: any[]) {
        if (typeof window !== 'undefined') {
            const logs = (window as any)._customLogs || [];
            logs.push({ level: 'warn', message, args, timestamp: new Date().toISOString() });
            (window as any)._customLogs = logs;
        }
    }
}

export default Logger;
