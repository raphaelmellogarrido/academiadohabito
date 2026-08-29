import { useEffect, useRef, useState } from "react";

const LADO = 260; // canvas quadrado (px) — mesma proporção do arquivo exportado

interface Offset {
  x: number;
  y: number;
}

// Crop quadrado feito em <canvas>: zoom por slider + arraste pra reposicionar,
// sempre mantendo a imagem cobrindo o quadrado inteiro (sem sobra em branco).
export function CropAvatarModal({
  arquivo,
  onCancelar,
  onConfirmar,
}: {
  arquivo: File;
  onCancelar: () => void;
  onConfirmar: (blob: Blob) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagemRef = useRef<HTMLImageElement | null>(null);
  const arrastoRef = useRef<{ ativo: boolean; inicioX: number; inicioY: number; offsetInicial: Offset }>({
    ativo: false,
    inicioX: 0,
    inicioY: 0,
    offsetInicial: { x: 0, y: 0 },
  });

  const [pronto, setPronto] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      imagemRef.current = img;
      setPronto(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function limites(zoomAtual: number) {
    const img = imagemRef.current;
    if (!img) return { maxX: 0, maxY: 0, escalaBase: 1 };
    const escalaBase = LADO / Math.min(img.naturalWidth, img.naturalHeight);
    const escala = escalaBase * zoomAtual;
    const largura = img.naturalWidth * escala;
    const altura = img.naturalHeight * escala;
    return { maxX: Math.max(0, (largura - LADO) / 2), maxY: Math.max(0, (altura - LADO) / 2), escalaBase };
  }

  function clampOffset(bruto: Offset, zoomAtual: number): Offset {
    const { maxX, maxY } = limites(zoomAtual);
    return {
      x: Math.min(maxX, Math.max(-maxX, bruto.x)),
      y: Math.min(maxY, Math.max(-maxY, bruto.y)),
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imagemRef.current;
    if (!canvas || !img || !pronto) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { escalaBase } = limites(zoom);
    const escala = escalaBase * zoom;
    const largura = img.naturalWidth * escala;
    const altura = img.naturalHeight * escala;
    const x = (LADO - largura) / 2 + offset.x;
    const y = (LADO - altura) / 2 + offset.y;

    ctx.clearRect(0, 0, LADO, LADO);
    ctx.drawImage(img, x, y, largura, altura);
  }, [pronto, zoom, offset]);

  function aoMudarZoom(novoZoom: number) {
    setZoom(novoZoom);
    setOffset((atual) => clampOffset(atual, novoZoom));
  }

  function aoIniciarArrasto(e: React.MouseEvent) {
    arrastoRef.current = { ativo: true, inicioX: e.clientX, inicioY: e.clientY, offsetInicial: offset };
  }

  function aoMoverArrasto(e: React.MouseEvent) {
    if (!arrastoRef.current.ativo) return;
    const dx = e.clientX - arrastoRef.current.inicioX;
    const dy = e.clientY - arrastoRef.current.inicioY;
    const { offsetInicial } = arrastoRef.current;
    setOffset(clampOffset({ x: offsetInicial.x + dx, y: offsetInicial.y + dy }, zoom));
  }

  function aoSoltarArrasto() {
    arrastoRef.current.ativo = false;
  }

  function confirmar() {
    canvasRef.current?.toBlob((blob) => blob && onConfirmar(blob), "image/jpeg", 0.9);
  }

  return (
    <div className="cfg-modal-fundo" role="dialog" aria-modal="true">
      <div className="cfg-modal">
        <p className="cartao-titulo">Ajustar foto</p>
        <canvas
          ref={canvasRef}
          width={LADO}
          height={LADO}
          className="cfg-crop-canvas"
          onMouseDown={aoIniciarArrasto}
          onMouseMove={aoMoverArrasto}
          onMouseUp={aoSoltarArrasto}
          onMouseLeave={aoSoltarArrasto}
        />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => aoMudarZoom(Number(e.target.value))}
          className="cfg-crop-zoom"
        />
        <div className="cfg-modal-acoes">
          <button type="button" className="cfg-btn-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="cfg-btn-primario" onClick={confirmar} disabled={!pronto}>
            Usar esta foto
          </button>
        </div>
      </div>
    </div>
  );
}
