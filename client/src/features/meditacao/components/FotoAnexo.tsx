import { useEffect, useState } from "react";

// Miniatura clicável (32x32) usada tanto na pré-visualização do composer
// quanto nas fotos já publicadas em posts/comentários (Feed.tsx,
// ComentariosAulas.tsx, ComentarioBloco.tsx). Clicar abre a foto em tamanho
// real, centralizada na tela, num lightbox simples (sem lib extra) — fecha
// clicando fora da imagem, no X ou apertando Esc.
export function FotoAnexo({ src, className = "" }: { src: string; className?: string }) {
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    if (!ampliada) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAmpliada(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [ampliada]);

  return (
    <>
      <img src={src} alt="" className={`cm-foto-anexo ${className}`} onClick={() => setAmpliada(true)} />
      {ampliada && (
        <div className="cm-foto-lightbox" onClick={() => setAmpliada(false)}>
          <button type="button" className="cm-foto-lightbox-fechar" onClick={() => setAmpliada(false)} title="Fechar">
            ×
          </button>
          <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
