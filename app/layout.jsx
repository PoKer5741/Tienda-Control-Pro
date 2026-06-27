import './globals.css';
import Navbar from '@/components/Navbar'; 
import CentinelaPersonal from '@/components/CentinelaPersonal'; 

export const metadata = {
  title: 'Tienda Control Pro',
  description: 'Sistema POS y Gestión',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <CentinelaPersonal />
        {children}
      </body>
    </html>
  );
}