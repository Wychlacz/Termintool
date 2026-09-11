import React from 'react';

export type LegalTab = 'impressum' | 'datenschutz' | 'agb';

interface LegalModalProps {
  activeTab: LegalTab;
  onClose: () => void;
  onSelectTab: (tab: LegalTab) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ activeTab, onClose, onSelectTab }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('impressum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'impressum'
                  ? 'bg-artreisen-blue text-white shadow'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              Impressum
            </button>
            <button
              onClick={() => onSelectTab('datenschutz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'datenschutz'
                  ? 'bg-emerald-700 text-white shadow'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Datenschutz (DSGVO)
            </button>
            <button
              onClick={() => onSelectTab('agb')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'agb'
                  ? 'bg-artreisen-orange text-white shadow'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              AGB
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center font-bold text-lg transition-colors"
            title="Schließen"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-gray-700 leading-relaxed">
          {/* --- IMPRESSUM --- */}
          {activeTab === 'impressum' && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-black uppercase text-artreisen-blue tracking-wide">
                  Impressum & Pflichterklärungen
                </h3>
                <p className="text-xs text-gray-500">Angaben gemäß § 5 TMG & DL-InfoV</p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">Betreiber der Website:</strong>
                <p className="font-semibold text-gray-800">Reisebüro art reisen GmbH</p>
                <p>Mühlenstrasse 21-23</p>
                <p>40822 Mettmann</p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">Kontakt:</strong>
                <p>Telefon: 02104 75711 (bzw. +49 2104 75711)</p>
                <p>
                  E-Mail:{' '}
                  <a href="mailto:info@artreisen.de" className="text-artreisen-blue font-bold underline">
                    info@artreisen.de
                  </a>
                </p>
                <p>
                  Website:{' '}
                  <a href="https://artreisen.de" target="_blank" rel="noopener noreferrer" className="text-artreisen-blue font-bold underline">
                    artreisen.de
                  </a>
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">Handelsregister & Steuernummer:</strong>
                <p>Registergericht: Amtsgericht Wuppertal</p>
                <p>Registernummer: HRB 19382</p>
                <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE119423766</p>
                <p className="mt-1 text-xs text-gray-600">Redaktionell verantwortlich: Bernd Wychlacz</p>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/70 text-xs text-amber-900 leading-normal">
                💡 <strong>Vermittler-Information:</strong> Die Reisebüro art reisen GmbH vermittelt Unterkünfte, Flüge und Pauschalreisen als Reiseveranstalter/Reisebüro im Sinne des BGB. Wir besitzen alle gesetzlich verankerten Reiseversicherungen & Insolvenzschutzbriefe.
              </div>
            </div>
          )}

          {/* --- DATENSCHUTZ --- */}
          {activeTab === 'datenschutz' && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-black uppercase text-emerald-800 tracking-wide">
                  Datenschutzerklärung (DSGVO)
                </h3>
                <p className="text-xs text-gray-500">Informationen zur Verarbeitung personenbezogener Daten</p>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-normal">
                🛡️ <strong>Verantwortliche Stelle:</strong> Reisebüro art reisen GmbH, Mühlenstrasse 21-23, 40822 Mettmann, E-Mail: <a href="mailto:info@artreisen.de" className="underline font-bold text-emerald-900">info@artreisen.de</a>, Tel. 02104 75711. Wir verarbeiten Ihre Daten streng im Einklang mit der EU-Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  1. Zweck und Rechtsgrundlage der Datenverarbeitung (Art. 13 Abs. 1 lit. c DSGVO)
                </strong>
                <p className="text-xs text-gray-600">
                  Die von Ihnen im Terminplaner eingegebenen personenbezogenen Daten (Name, Vorname, E-Mail-Adresse, Telefonnummer, Wunschtermine und gewünschte Beratungsform) werden ausschließlich zur Bearbeitung und Bestätigung Ihrer Terminanfrage verarbeitet (<strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – vorvertragliche Maßnahmen).
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  2. Empfänger der Daten & Auftragsverarbeitung (Art. 13 Abs. 1 lit. e DSGVO)
                </strong>
                <p className="text-xs text-gray-600">
                  Ihre Daten werden vertraulich behandelt und nicht an unbefugte Dritte weitergegeben. Der Zugriff erfolgt ausschließlich durch autorisierte Reiseberater der art reisen GmbH zur Terminkoordination.
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  3. Speicherdauer & Löschfristen (Art. 13 Abs. 2 lit. a DSGVO)
                </strong>
                <p className="text-xs text-gray-600">
                  Ihre Termindaten werden nach Durchführung oder Absage des Beratungstermins gelöscht, sofern sich kein nachfolgender Reisevertrag oder gesetzliche handels- bzw. steuerrechtliche Aufbewahrungsfristen ergeben.
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  4. SSL-/TLS-Verschlüsselung & Datensicherheit
                </strong>
                <p className="text-xs text-gray-600">
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine 256-Bit-SSL- bzw. TLS-Verschlüsselung.
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  5. Ihre Rechte als betroffene Person
                </strong>
                <p className="text-xs text-gray-600">
                  Sie haben das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten sowie ein Recht auf Berichtigung, Einschränkung oder Löschung dieser Daten. Wenden Sie sich hierzu jederzeit formlos an <a href="mailto:info@artreisen.de" className="text-artreisen-blue underline">info@artreisen.de</a>.
                </p>
              </div>

              <div className="pt-2 text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border">
                Ausführliche und vollständige Datenschutzhinweise finden Sie unter{' '}
                <a href="https://artreisen.de/datenschutz/" target="_blank" rel="noopener noreferrer" className="text-artreisen-blue underline font-bold">
                  https://artreisen.de/datenschutz/
                </a>.
              </div>
            </div>
          )}

          {/* --- AGB --- */}
          {activeTab === 'agb' && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-black uppercase text-artreisen-orange tracking-wide">
                  Allgemeine Geschäfts- und Reisebedingungen (AGB)
                </h3>
                <p className="text-xs text-gray-500">Reisebüro art reisen GmbH, Mühlenstrasse 21-23, 40822 Mettmann</p>
              </div>

              <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/60 text-xs text-orange-950 leading-normal">
                📄 <strong>Allgemeine Geschäfts- und Reisebedingungen (AGB):</strong> Reisebüro art reisen GmbH, Mühlenstrasse 21-23, 40822 Mettmann.
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  1. Geltungsbereich & Terminservice
                </strong>
                <p className="text-xs text-gray-600">
                  Die Terminbuchung über diesen Online-Terminplaner ist ein kostenloser Service der Reisebüro art reisen GmbH zur Vereinbarung unverbindlicher persönlicher Beratungsgespräche für Reisen, Urlaube und Kreuzfahrten.
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  2. Reisevermittlung & Zustandekommen von Reiseverträgen
                </strong>
                <p className="text-xs text-gray-600">
                  Diese Allgemeinen Geschäftsbedingungen gelten für alle Pauschalreiseverträge und Reisevermittlungen der Reisebüro art reisen GmbH. Erst durch gesonderte Buchung eines konkreten Reiseangebots nach der Beratung kommt ein verbindlicher Reisevermittlungs- oder Pauschalreisevertrag zustande.
                </p>
              </div>

              <div>
                <strong className="block text-gray-900 font-bold text-xs uppercase mb-1">
                  3. Insolvenzabsicherung & Kundengeldabsicherung
                </strong>
                <p className="text-xs text-gray-600">
                  Gemäß § 651r BGB sind alle Kundengelder bei Buchung einer Pauschalreise insolvenzversichert. Der gesetzlich vorgeschriebene Sicherungsschein wird zusammen mit der Reisebestätigung übermittelt.
                </p>
              </div>

              <div className="pt-2 text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border">
                Den vollständigen und rechtsverbindlichen Text unserer AGB finden Sie unter{' '}
                <a href="https://artreisen.de/agb/" target="_blank" rel="noopener noreferrer" className="text-artreisen-blue underline font-bold">
                  https://artreisen.de/agb/
                </a>.
              </div>
            </div>
          )}
        </div>

        {/* Footer Close Button */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-artreisen-blue hover:bg-blue-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
