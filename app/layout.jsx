import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Tienda Control Pro',
  description: 'Sistema de gestion comercial y base de datos relacional',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}