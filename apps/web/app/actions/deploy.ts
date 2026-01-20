'use server';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function deployApp() {
    try {
        // The command opens a new cmd window, changes directory to Infrastructure, runs the bat file, and pauses so the user can see output/errors
        const command = `start cmd.exe /c "cd /d c:\\Users\\Carlos\\SOTOdelPRIOR\\Infraestructure && DESPLEGAR.bat && pause"`;

        await execAsync(command);
        return { success: true, message: 'Deployment process started in a new window' };
    } catch (error) {
        console.error('Deployment error:', error);
        return { success: false, message: 'Failed to start deployment process' };
    }
}
