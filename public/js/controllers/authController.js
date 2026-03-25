import { authTemplate } from '/js/templates/authTemplate.js';

const authForm = document.getElementById('authForm');

function renderLogin() {
    authForm.innerHTML = authTemplate.login;

    document.getElementById('formLogin').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            tienda_nombre: document.getElementById('tienda_nombre').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        };

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const json = await res.json();

            if (!res.ok) {
                alert(json.error || 'Error al iniciar sesión');
                return;
            }

            localStorage.setItem('token', json.token);
            localStorage.setItem('usuario', JSON.stringify(json.usuario));
            localStorage.setItem('tienda', JSON.stringify(json.tienda));

            if (json.usuario.id_rol === 1) {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/vendedor/dashboard';
            }

        } catch (err) {
            alert('Error de conexión');
        }
    });
}

function renderRegistro() {
    authForm.innerHTML = authTemplate.register;

    document.getElementById('formRegistro').addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmar = document.getElementById('confirmarPassword').value;

        if (password !== confirmar) {
            alert('Las contraseñas no coinciden');
            return;
        }

        const data = {
            tienda_name: document.getElementById('tienda_name').value,
            nombre: document.getElementById('nombre').value,
            apellidos: document.getElementById('apellidos').value,
            email: document.getElementById('email').value,
            password: password,
            password_confirmation: confirmar,
        };

        try {
            const res = await fetch('/api/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const json = await res.json();

            if (!res.ok) {
                alert(json.message || 'Error al registrarse');
                return;
            }

            localStorage.setItem('token', json.token);
            localStorage.setItem('usuario', JSON.stringify(json.usuario));
            localStorage.setItem('tienda', JSON.stringify(json.tienda));

            window.location.href = '/admin/dashboard';

        } catch (err) {
            alert('Error de conexión');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

    if (token && usuario) {
        if (usuario.id_rol === 1) {
            window.location.href = '/admin/dashboard';
        } else {
            window.location.href = '/vendedor/dashboard';
        }
        return;
    }

    const path = window.location.pathname;
    if (path === '/registrate') {
        renderRegistro();
    } else {
        renderLogin();
    }
});