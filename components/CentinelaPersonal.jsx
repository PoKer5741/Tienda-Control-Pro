'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
 
import { bloquearAccesoAdministrador } from '@/app/actions/trabajadoresActions';

export default function CentinelaPersonal() {
    const pathname = usePathname();

    useEffect(() => {
         
        if (pathname !== '/personal') {
            bloquearAccesoAdministrador().catch(console.error);
        }
    }, [pathname]);

    return null;  
}