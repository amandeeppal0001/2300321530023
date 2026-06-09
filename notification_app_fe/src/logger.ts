class Logger {
    static info(MESSAGE: string, ...ARGS: any[]) {
        if (typeof window !== 'undefined') {
            const LOGS = (window as any)._customLogs || [];
            LOGS.push({ level: 'info', MESSAGE, ARGS, timestamp: new Date().toISOString() });
            (window as any)._customLogs = LOGS;
        }
    }

    static error(MESSAGE: string, ...ARGS: any[]) {
        if (typeof window !== 'undefined') {
            const LOGS = (window as any)._customLogs || [];
            LOGS.push({ level: 'error', MESSAGE, ARGS, timestamp: new Date().toISOString() });
            (window as any)._customLogs = LOGS;
        }
    }
    
    static warn(MESSAGE: string, ...ARGS: any[]) {
        if (typeof window !== 'undefined') {
            const LOGS = (window as any)._customLogs || [];
            LOGS.push({ level: 'warn', MESSAGE, ARGS, timestamp: new Date().toISOString() });
            (window as any)._customLogs = LOGS;
        }
    }
}

export default Logger;
