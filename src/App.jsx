import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_STAGE_HEIGHT = 560
const MAX_STAGE_HEIGHT = 840
const MIN_ITEM_SIZE = 80

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
  { id: 'orbit', label: 'Orbit', src: createArt('Orbit', '#f97316', '#fbbf24', '#7c2d12') },
  { id: 'aurora', label: 'Aurora', src: createArt('Aurora', '#2563eb', '#7c3aed', '#db2777') },
  { id: 'desert', label: 'Desert', src: createArt('Desert', '#0f766e', '#f59e0b', '#065f46') },
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

function App() {
  const stageHostRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const interactionRef = useRef(null)
  const imageCacheRef = useRef({})

  const [stageSize, setStageSize] = useState({ width: 960, height: 640 })
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [selectedId, setSelectedId] = useState(INITIAL_ITEMS[0].id)
  const [isDropActive, setIsDropActive] = useState(false)
  const [message, setMessage] = useState('Drop images onto the canvas or drag in a starter picture.')

  const stageHeight = clamp(Math.round(stageSize.width * 0.7), MIN_STAGE_HEIGHT, MAX_STAGE_HEIGHT)

  const updateItem = useCallback((id, patch) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
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

  const setImageForId = useCallback((id, src) => {
    if (imageCacheRef.current[id]) {
      return imageCacheRef.current[id]
    }

    const image = new window.Image()
    image.src = src
    imageCacheRef.current[id] = image
    return image
  }, [])

  useEffect(() => {
    const host = stageHostRef.current
    if (!host) {
      return undefined
    }

    const updateSize = () => {
      const width = Math.max(320, Math.floor(host.clientWidth))
      const height = clamp(Math.round(width * 0.7), MIN_STAGE_HEIGHT, MAX_STAGE_HEIGHT)
      setStageSize({ width, height })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(host)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    canvas.width = stageSize.width
    canvas.height = stageHeight

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(1, '#111827')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    context.lineWidth = 1

    for (let x = 0; x <= canvas.width; x += 80) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, canvas.height)
      context.stroke()
    }

    for (let y = 0; y <= canvas.height; y += 80) {
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(canvas.width, y)
      context.stroke()
    }
  }, [stageHeight, stageSize.height, stageSize.width])

  useEffect(() => {
    const onPointerMove = (event) => {
      const interaction = interactionRef.current
      if (!interaction) {
        return
      }

      const host = stageHostRef.current
      if (!host) {
        return
      }

      const bounds = host.getBoundingClientRect()
      const pointerX = event.clientX - bounds.left
      const pointerY = event.clientY - bounds.top
      const dx = pointerX - interaction.startPointer.x
      const dy = pointerY - interaction.startPointer.y

      if (interaction.type === 'move') {
        updateItem(interaction.id, {
          x: clamp(interaction.startItem.x + dx, 0, stageSize.width - interaction.startItem.width),
          y: clamp(interaction.startItem.y + dy, 0, stageHeight - interaction.startItem.height),
        })
        return
      }

      const next = { ...interaction.startItem }

      if (interaction.handle.includes('right')) {
        next.width = Math.max(MIN_ITEM_SIZE, interaction.startItem.width + dx)
      }

      if (interaction.handle.includes('bottom')) {
        next.height = Math.max(MIN_ITEM_SIZE, interaction.startItem.height + dy)
      }

      if (interaction.handle.includes('left')) {
        const width = Math.max(MIN_ITEM_SIZE, interaction.startItem.width - dx)
        next.x = interaction.startItem.x + (interaction.startItem.width - width)
        next.width = width
      }

      if (interaction.handle.includes('top')) {
        const height = Math.max(MIN_ITEM_SIZE, interaction.startItem.height - dy)
        next.y = interaction.startItem.y + (interaction.startItem.height - height)
        next.height = height
      }

      next.x = clamp(next.x, 0, Math.max(0, stageSize.width - next.width))
      next.y = clamp(next.y, 0, Math.max(0, stageHeight - next.height))

      updateItem(interaction.id, next)
      setMessage('Picture resized.')
    }

    const onPointerUp = () => {
      if (interactionRef.current) {
        interactionRef.current = null
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [stageHeight, stageSize.width, updateItem])

  const handleSelect = useCallback(
    (id) => {
      setSelectedId(id)
      bringToFront(id)
    },
    [bringToFront],
  )

  const startMove = useCallback(
    (event, item) => {
      event.preventDefault()
      event.stopPropagation()
      handleSelect(item.id)
      interactionRef.current = {
        type: 'move',
        id: item.id,
        startPointer: { x: event.clientX - stageHostRef.current.getBoundingClientRect().left, y: event.clientY - stageHostRef.current.getBoundingClientRect().top },
        startItem: { ...item },
      }
      setMessage('Picture moved.')
    },
    [handleSelect],
  )

  const startResize = useCallback(
    (event, item, handle) => {
      event.preventDefault()
      event.stopPropagation()
      handleSelect(item.id)
      interactionRef.current = {
        type: 'resize',
        id: item.id,
        handle,
        startPointer: { x: event.clientX - stageHostRef.current.getBoundingClientRect().left, y: event.clientY - stageHostRef.current.getBoundingClientRect().top },
        startItem: { ...item },
      }
    },
    [handleSelect],
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

  const handleUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || [])
      if (!files.length) {
        return
      }

      await loadFiles(files, {
        x: 120,
        y: 120,
      })

      event.target.value = ''
    },
    [loadFiles],
  )

  const clearCanvas = useCallback(() => {
    setItems([])
    setSelectedId(null)
    setMessage('Canvas cleared.')
  }, [])

  const renderHandle = (item, handle, positionStyle) => (
    <button
      type="button"
      className={`resize-handle ${handle}`}
      style={positionStyle}
      onPointerDown={(event) => startResize(event, item, handle)}
      aria-label={`Resize ${handle}`}
    />
  )

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
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={() => setIsDropActive(true)}
          onDragLeave={() => setIsDropActive(false)}
          onPointerDown={() => setSelectedId(null)}
        >
          <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />
          <div className="stage-overlay" style={{ width: stageSize.width, height: stageHeight }}>
            <div className="stage-labels">
              <p>Canvas</p>
              <span>Select an image to resize it, or drag new pictures in from the sidebar.</span>
            </div>

            {items.map((item) => {
              const isSelected = item.id === selectedId
              const image = setImageForId(item.id, item.src)

              return (
                <div
                  key={item.id}
                  className={`canvas-item ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                  }}
                >
                  <button
                    type="button"
                    className="canvas-item-surface"
                    onPointerDown={(event) => startMove(event, item)}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleSelect(item.id)
                    }}
                    aria-label={`Move ${item.label}`}
                  >
                    <img src={image.src} alt={item.label} draggable="false" />
                    <span className="canvas-item-title">{item.label}</span>
                  </button>

                  {isSelected && (
                    <>
                      {renderHandle(item, 'top-left', { left: -6, top: -6 })}
                      {renderHandle(item, 'top-right', { right: -6, top: -6 })}
                      {renderHandle(item, 'bottom-left', { left: -6, bottom: -6 })}
                      {renderHandle(item, 'bottom-right', { right: -6, bottom: -6 })}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
