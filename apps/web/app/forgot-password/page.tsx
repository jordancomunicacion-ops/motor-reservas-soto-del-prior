export default function ForgotPasswordPage() {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    Recuperar Contraseña
                </h1>
                <p className="text-center text-gray-600 mb-4">
                    Por favor, contacta con el administrador del sistema para restablecer tu contraseña.
                </p>
                <div className="text-center">
                    <a href="/login" className="text-purple-600 hover:text-purple-800">
                        Volver al inicio de sesión
                    </a>
                </div>
            </div>
        </div>
    );
}
