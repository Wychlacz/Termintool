
import React from 'react';
import { type AppTheme } from '../types';

interface HeaderProps {
  theme: AppTheme;
}

export const Header: React.FC<HeaderProps> = ({ theme }) => {
  const icon = theme === 'default' ? '🌍' : '🐾';
  const compassIcon = '🧭';
  
  return (
    <header className="text-center relative pt-4">
      <h1 className="font-montserrat text-3xl sm:text-4xl font-bold mb-2">
        {compassIcon} Art Reisen
      </h1>
      <h2 className="font-montserrat text-2xl sm:text-3xl font-bold mb-4">
        Buche deinen persönlichen Beratungstermin {icon}
      </h2>
      <p className="max-w-2xl mx-auto text-base sm:text-lg">
        Wähle einfach deine Wunschtermine – wir prüfen automatisch die Verfügbarkeit und bestätigen deinen Termin persönlich.
      </p>
    </header>
  );
};
