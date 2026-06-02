import { Roboto } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: "Tienda Control Pro",
  description: "Sistema de inventario y gestión comercial",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={roboto.className}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
