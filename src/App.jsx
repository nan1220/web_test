import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from 'react-konva'

const MIN_STAGE_HEIGHT = 560
const MAX_STAGE_HEIGHT = 840

function createId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function createArt(title, from, to, accent) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
        <radialGradient id="r" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.55)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="900" height="640" rx="42" fill="url(#g)" />
      <circle cx="190" cy="150" r="130" fill="rgba(255,255,255,0.22)" />
      <circle cx="690" cy="120" r="160" fill="rgba(255,255,255,0.18)" />
      <path d="M0 470 C 140 380, 250 540, 430 440 S 720 350, 900 490 L 900 640 L 0 640 Z" fill="rgba(15,23,42,0.14)" />
      <rect x="70" y="70" width="760" height="500" rx="30" fill="url(#r)" opacity="0.5" />
      <text x="84" y="560" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${title}</text>
      <text x="84" y="604" fill="rgba(255,255,255,0.86)" font-family="Arial, Helvetica, sans-serif" font-size="24">Drag, resize, and remix this asset</text>
      <circle cx="744" cy="228" r="48" fill="${accent}" opacity="0.92" />
      <circle cx="790" cy="470" r="68" fill="rgba(255,255,255,0.28)" />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const SAMPLE_IMAGES = [
  {
    id: 'orbit',
    label: 'Orbit',
    src: createArt('Orbit', '#f97316', '#fbbf24', '#7c2d12'),
  },
  {
    id: 'aurora',
    label: 'Aurora',
    src: createArt('Aurora', '#2563eb', '#7c3aed', '#db2777'),
  },
  {
    id: 'desert',
    label: 'Desert',
    src: createArt('Desert', '#0f766e', '#f59e0b', '#065f46'),
  },
]

const INITIAL_ITEMS = [
  {
    id: createId('seed'),
    label: 'Orbit',
    src: SAMPLE_IMAGES[0].src,
    x: 120,
    y: 120,
    width: 280,
    height: 199,
  },
]

function PictureNode({ item, isSelected, onSelect, onUpdate, onTransformEnd, registerNode }) {
  const shapeRef = useRef(null)
  const [image, setImage] = useState(null)

  useEffect(() => {
    const transformer = registerNode.current
    const selectedNode = shapeRef.current

    if (!transformer) {
      return
    }

    if (isSelected && image && selectedNode) {
      transformer.nodes([selectedNode])
      transformer.getLayer()?.batchDraw()
    }
  }, [image, isSelected, registerNode])

  useEffect(() => {
    let isActive = true
    const loadedImage = new window.Image()
    loadedImage.onload = () => {
      if (isActive) {
        setImage(loadedImage)
      }
    }
    loadedImage.src = item.src

    return () => {
      isActive = false
    }
  }, [item.src])

  return (
    <>
      {image && (
        <KonvaImage
          ref={shapeRef}
          image={image}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          draggable
          onClick={() => onSelect(item.id)}
          onTap={() => onSelect(item.id)}
          onDragStart={() => onSelect(item.id)}
          onDragEnd={(event) => {
            onUpdate(item.id, {
              x: event.target.x(),
              y: event.target.y(),
            })
          }}
          onTransformStart={() => onSelect(item.id)}
          onTransformEnd={() => onTransformEnd(item.id, shapeRef.current)}
          shadowColor="rgba(0, 0, 0, 0.3)"
          shadowBlur={20}
          shadowOffset={{ x: 0, y: 12 }}
          shadowOpacity={0.25}
          cornerRadius={24}
        />
      )}

      {isSelected && image && (
        <Rect
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          stroke="#ffffff"
          strokeWidth={2}
          dash={[8, 6]}
          listening={false}
        />
      )}
    </>
  )
}

function App() {
  const stageHostRef = useRef(null)
  const stageRef = useRef(null)
  const transformerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [stageSize, setStageSize] = useState({ width: 960, height: 640 })
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [selectedId, setSelectedId] = useState(INITIAL_ITEMS[0].id)
  const [isDropActive, setIsDropActive] = useState(false)
  const [message, setMessage] = useState('Drop images onto the canvas or drag in a starter picture.')

  const stageHeight = useMemo(() => {
    return clamp(Math.round(stageSize.width * 0.7), MIN_STAGE_HEIGHT, MAX_STAGE_HEIGHT)
  }, [stageSize.width])

  useEffect(() => {
    const host = stageHostRef.current
    if (!host) {
      return undefined
    }

    const updateSize = () => {
      const width = Math.max(320, Math.floor(host.clientWidth))
      setStageSize({ width, height: clamp(Math.round(width * 0.7), MIN_STAGE_HEIGHT, MAX_STAGE_HEIGHT) })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(host)

    return () => resizeObserver.disconnect()
  }, [])

  const bringToFront = useCallback((id) => {
    setItems((currentItems) => {
      const target = currentItems.find((item) => item.id === id)
      if (!target) {
        return currentItems
      }

      return [...currentItems.filter((item) => item.id !== id), target]
    })
  }, [])

  const updateItem = useCallback((id, patch) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }, [])

  const addItem = useCallback(
    ({ src, label, x, y, width = 260, height = 184 }) => {
      const id = createId('image')
      const nextItem = {
        id,
        src,
        label,
        width,
        height,
        x: clamp(x, 16, Math.max(16, stageSize.width - width - 16)),
        y: clamp(y, 16, Math.max(16, stageHeight - height - 16)),
      }

      setItems((currentItems) => [...currentItems, nextItem])
      setSelectedId(id)
      setMessage(`${label} added to the canvas.`)
      bringToFront(id)
    },
    [bringToFront, stageHeight, stageSize.width],
  )

  const handleSelect = useCallback(
    (id) => {
      setSelectedId(id)
      bringToFront(id)
    },
    [bringToFront],
  )

  const handleCanvasMouseDown = useCallback((event) => {
    if (event.target === event.target.getStage()) {
      setSelectedId(null)
    }
  }, [])

  const handleTransformEnd = useCallback(
    (id, node) => {
      if (!node) {
        return
      }

      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const nextWidth = Math.max(80, Math.round(node.width() * scaleX))
      const nextHeight = Math.max(80, Math.round(node.height() * scaleY))

      node.scaleX(1)
      node.scaleY(1)

      updateItem(id, {
        x: node.x(),
        y: node.y(),
        width: nextWidth,
        height: nextHeight,
      })
      setMessage('Picture resized.')
    },
    [updateItem],
  )

  const loadFiles = useCallback(
    async (files, point) => {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (!imageFiles.length) {
        setMessage('Only image files can be dropped on the canvas.')
        return
      }

      for (const file of imageFiles) {
        const src = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(file)
        })

        addItem({
          src,
          label: file.name.replace(/\.[^.]+$/, '') || file.name,
          x: point.x,
          y: point.y,
          width: 280,
          height: 198,
        })
      }
    },
    [addItem],
  )

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault()
      setIsDropActive(false)

      const host = stageHostRef.current
      if (!host) {
        return
      }

      const bounds = host.getBoundingClientRect()
      const point = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }

      const sampleId = event.dataTransfer.getData('application/x-canvas-sample')
      if (sampleId) {
        const sample = SAMPLE_IMAGES.find((item) => item.id === sampleId)
        if (sample) {
          addItem({
            src: sample.src,
            label: sample.label,
            x: point.x - 130,
            y: point.y - 92,
          })
        }
        return
      }

      const files = Array.from(event.dataTransfer.files || [])
      if (files.length) {
        await loadFiles(files, {
          x: point.x - 140,
          y: point.y - 100,
        })
      }
    },
    [addItem, loadFiles],
  )

  const handlePaletteDragStart = useCallback((sample, event) => {
    event.dataTransfer.setData('application/x-canvas-sample', sample.id)
    event.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
  }, [])

  const handleUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      return
    }

    await loadFiles(files, {
      x: 120,
      y: 120,
    })

    event.target.value = ''
  }, [loadFiles])

  const clearCanvas = useCallback(() => {
    setItems([])
    setSelectedId(null)
    setMessage('Canvas cleared.')
  }, [])

  return (
    <main className="editor-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">React canvas editor</p>
          <h1>Image board</h1>
          <p className="lede">
            Drop pictures onto the canvas, move them around, and resize them with the
            selection handles.
          </p>
        </div>

        <div className="toolbar">
          <button type="button" className="button button-primary" onClick={() => fileInputRef.current?.click()}>
            Upload pictures
          </button>
          <button type="button" className="button button-secondary" onClick={clearCanvas}>
            Clear canvas
          </button>
          <input ref={fileInputRef} className="hidden-input" type="file" accept="image/*" multiple onChange={handleUpload} />
        </div>

        <section className="palette-card">
          <div className="palette-heading">
            <p className="eyebrow">Starter pictures</p>
            <span>Drag to the canvas</span>
          </div>
          <div className="palette-grid">
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                draggable
                onDragStart={(event) => handlePaletteDragStart(sample, event)}
                className="palette-tile"
              >
                <img src={sample.src} alt={sample.label} />
                <strong>{sample.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="instructions-card">
          <p className="eyebrow">How it works</p>
          <ol>
            <li>Upload an image or drag in a starter picture.</li>
            <li>Click a picture to select it and show resize handles.</li>
            <li>Drag to move, or pull the corners to resize.</li>
          </ol>
          <p className="status-line">{message}</p>
        </section>
      </aside>

      <section className="canvas-workspace">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Artboard</p>
            <h2>Drop zone and editing surface</h2>
          </div>
          <p className={`workspace-badge ${isDropActive ? 'is-active' : ''}`}>
            {isDropActive ? 'Release to place' : 'Ready for drops'}
          </p>
        </div>

        <div
          ref={stageHostRef}
          className={`canvas-shell ${isDropActive ? 'is-dropping' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={() => setIsDropActive(true)}
          onDragLeave={() => setIsDropActive(false)}
        >
          <svg className="canvas-border-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="canvas-border-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <rect className="canvas-border-base" x="1.5" y="1.5" width="97" height="97" rx="5" pathLength="1000" />
            <rect className="canvas-border-trail" x="1.5" y="1.5" width="97" height="97" rx="5" pathLength="1000" />
          </svg>

          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageHeight}
            onMouseDown={handleCanvasMouseDown}
            onTouchStart={handleCanvasMouseDown}
          >
            <Layer>
              <Rect width={stageSize.width} height={stageHeight} fill="#111827" />
              {Array.from({ length: Math.ceil(stageSize.width / 80) + 1 }).map((_, index) => (
                <Rect
                  key={`grid-x-${index}`}
                  x={index * 80}
                  width={1}
                  height={stageHeight}
                  fill="rgba(255,255,255,0.04)"
                  listening={false}
                />
              ))}
              {Array.from({ length: Math.ceil(stageHeight / 80) + 1 }).map((_, index) => (
                <Rect
                  key={`grid-y-${index}`}
                  y={index * 80}
                  width={stageSize.width}
                  height={1}
                  fill="rgba(255,255,255,0.04)"
                  listening={false}
                />
              ))}

              <Text
                x={28}
                y={24}
                text="Canvas"
                fontSize={22}
                fontStyle="700"
                fill="rgba(255,255,255,0.8)"
                listening={false}
              />
              <Text
                x={28}
                y={54}
                text="Select an image to resize it, or drag new pictures in from the sidebar."
                fontSize={14}
                fill="rgba(255,255,255,0.56)"
                listening={false}
              />

              {items.map((item) => (
                <PictureNode
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={handleSelect}
                  onUpdate={updateItem}
                  onTransformEnd={handleTransformEnd}
                  registerNode={transformerRef}
                />
              ))}

              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                keepRatio
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                anchorSize={12}
                borderStroke="#f8fafc"
                borderStrokeWidth={2}
                anchorFill="#f8fafc"
                anchorStroke="#1f2937"
                anchorCornerRadius={2}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 80 || newBox.height < 80) {
                    return oldBox
                  }
                  return newBox
                }}
              />
            </Layer>
          </Stage>
        </div>
      </section>
    </main>
  )
}

export default App
