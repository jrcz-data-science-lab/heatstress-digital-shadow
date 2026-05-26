import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

async function initSession() {
	const res = await fetch('/backend/session/init', {
		method: 'GET',
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Failed to init session');
	return res.json();
}

async function bootstrap() {
	try {
		const data = await initSession();
		console.log('Session initialized:', data);
	} catch (err) {
		console.error('Failed to init session', err);
	}
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

bootstrap();
