const SELLOS = [
  "MAWZ Records",
  "Indyana Records",
  "Caserio Records",
  "Rizzvor",
  "Cach House",
  "La Juntada de los Artistas",
  "Streamings",
];

export default function SellosGrid() {
  return (
    <div className="mb-8">
      <p className="text-xs text-gray-500 mb-2">VPO CORP</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {SELLOS.map((sello) => (
          <button
            key={sello}
            type="button"
            className="aspect-square flex items-center justify-center text-center text-base font-semibold border rounded-lg px-2 py-2 hover:bg-gray-50 cursor-default"
          >
            {sello}
          </button>
        ))}
      </div>
    </div>
  );
}
