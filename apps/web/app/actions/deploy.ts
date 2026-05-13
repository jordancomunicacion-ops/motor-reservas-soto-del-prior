'use server';

import { exec } from 'child_process';
import { promisify } from 'util';
import { auth } from '@/auth';

const execAsync = promisify(exec);

export async function deployApp() {
    const session = await auth();
    if (!session?.user) {
        return { success: false, message: 'No autenticado' };
    }
    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Acción reservada al administrador' };
    }

    if (process.platform !== 'win32') {
        return { success: false, message: 'Solo disponible en el equipo de despliegue (Windows)' };
    }

    try {
        const command = `start cmd.exe /c "cd /d c:\\Users\\Carlos\\SOTOdelPRIOR\\Infraestructure && DESPLEGAR.bat && pause"`;
        await execAsync(command);
        return { success: true, message: 'Despliegue lanzado en una nueva ventana' };
    } catch (error) {
        console.error('Deployment error:', error);
        return { success: false, message: 'Error al lanzar el despliegue' };
    }
}
