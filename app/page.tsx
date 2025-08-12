"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface Bird {
  id: number
  x: number
  y: number
  speedX: number
  speedY: number
  points: number
  size: number
  type: "brown" | "black" | "red"
  wingPhase: number
}

interface Cloud {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  speed: number
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface Bullet {
  id: number
  x: number
  y: number
  speedX: number // added horizontal speed for angled shots
  speedY: number
}

export default function BirdAttackGame() {
  const [gameStarted, setGameStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [birds, setBirds] = useState<Bird[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [gunShooting, setGunShooting] = useState(false)
  const [gunAngle, setGunAngle] = useState(0) // added gun rotation angle state
  const [clouds, setClouds] = useState<Cloud[]>([])
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  const BirdSprite = ({ bird }: { bird: Bird }) => {
    const colors = {
      brown: { body: "#8B4513", wing: "#654321", beak: "#FFA500" },
      black: { body: "#2F2F2F", wing: "#1A1A1A", beak: "#FFD700" },
      red: { body: "#DC143C", wing: "#8B0000", beak: "#FF4500" },
    }

    const color = colors[bird.type]
    const wingOffset = Math.sin(bird.wingPhase) * 3

    return (
      <div
        className="absolute transition-transform hover:scale-110 drop-shadow-lg pointer-events-none"
        style={{
          left: `${bird.x}%`,
          top: `${bird.y}%`,
          width: `${bird.size}px`,
          height: `${bird.size}px`,
          transform: `scaleX(${bird.speedX > 0 ? 1 : -1})`,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 60 40" className="drop-shadow-md">
          <ellipse cx="30" cy="25" rx="18" ry="12" fill={color.body} />
          <circle cx="45" cy="20" r="10" fill={color.body} />
          <polygon points="52,20 60,18 60,22" fill={color.beak} />
          <circle cx="48" cy="17" r="2" fill="white" />
          <circle cx="49" cy="16" r="1" fill="black" />
          <ellipse
            cx="25"
            cy={20 + wingOffset}
            rx="12"
            ry="8"
            fill={color.wing}
            transform={`rotate(${wingOffset * 2} 25 20)`}
          />
          <ellipse cx="12" cy="25" rx="8" ry="6" fill={color.wing} />
          <line x1="35" y1="35" x2="35" y2="38" stroke={color.beak} strokeWidth="1" />
          <line x1="25" y1="35" x2="25" y2="38" stroke={color.beak} strokeWidth="1" />
        </svg>

        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-400 border-2 border-yellow-600 rounded-full px-2 py-1 text-xs font-bold text-gray-800 shadow-lg animate-pulse">
          {bird.points}
        </div>
      </div>
    )
  }

  const MachineGun = () => (
    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 pointer-events-none">
      <div
        className={`transition-transform duration-100 ${gunShooting ? "scale-110" : "scale-100"}`}
        style={{ transform: `rotate(${gunAngle}deg)` }} // added rotation based on gunAngle
      >
        <svg width="80" height="60" viewBox="0 0 80 60" className="drop-shadow-lg">
          {/* Gun base */}
          <rect x="30" y="45" width="20" height="15" fill="#4A4A4A" rx="2" />

          {/* Gun barrel */}
          <rect x="35" y="20" width="10" height="30" fill="#2F2F2F" rx="5" />

          {/* Gun body */}
          <rect x="25" y="35" width="30" height="15" fill="#5A5A5A" rx="3" />

          {/* Gun handle */}
          <rect x="32" y="40" width="16" height="8" fill="#3A3A3A" rx="2" />

          {/* Muzzle flash when shooting */}
          {gunShooting && (
            <g>
              <polygon points="40,20 35,15 45,15" fill="#FFD700" opacity="0.8" />
              <polygon points="40,20 32,12 48,12" fill="#FF6B35" opacity="0.6" />
              <circle cx="40" cy="18" r="3" fill="#FFFFFF" opacity="0.9" />
            </g>
          )}

          {/* Gun details */}
          <circle cx="40" cy="42" r="2" fill="#2F2F2F" />
          <rect x="38" y="25" width="4" height="2" fill="#FFD700" />
        </svg>
      </div>
    </div>
  )

  const BulletSprite = ({ bullet }: { bullet: Bullet }) => (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${bullet.x}%`,
        top: `${bullet.y}%`,
        width: "4px",
        height: "8px",
      }}
    >
      <div className="w-full h-full bg-yellow-400 rounded-full shadow-md border border-yellow-600"></div>
    </div>
  )

  const CloudSprite = ({ cloud }: { cloud: Cloud }) => (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${cloud.x}%`,
        top: `${cloud.y}%`,
        opacity: cloud.opacity,
      }}
    >
      <svg width={cloud.size} height={cloud.size * 0.6} viewBox="0 0 100 60">
        <defs>
          <filter id={`cloud-${cloud.id}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>
        <g filter={`url(#cloud-${cloud.id})`}>
          <circle cx="20" cy="40" r="15" fill="white" />
          <circle cx="35" cy="35" r="18" fill="white" />
          <circle cx="50" cy="35" r="16" fill="white" />
          <circle cx="65" cy="38" r="14" fill="white" />
          <circle cx="80" cy="42" r="12" fill="white" />
        </g>
      </svg>
    </div>
  )

  const createParticles = (x: number, y: number) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30,
        maxLife: 30,
      })
    }
    setParticles((prev) => [...prev, ...newParticles])
  }

  const initAudio = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioContext(ctx)
    }
  }, [audioContext])

  const playShootSound = useCallback(() => {
    if (!audioContext) return

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }, [audioContext])

  const shootBullet = useCallback(
    (clientX: number, clientY: number) => {
      if (!gameAreaRef.current) return

      initAudio()

      const angleRad = (gunAngle * Math.PI) / 180
      const speed = 3
      const speedX = Math.sin(angleRad) * speed
      const speedY = -Math.cos(angleRad) * speed

      const newBullet: Bullet = {
        id: Date.now() + Math.random(),
        x: 50, // Start from gun position (center)
        y: 85, // Start from gun position (bottom)
        speedX, // horizontal speed based on angle
        speedY, // vertical speed based on angle
      }

      setBullets((prev) => [...prev, newBullet])

      // Gun shooting animation
      setGunShooting(true)
      setTimeout(() => setGunShooting(false), 100)

      playShootSound()
    },
    [initAudio, playShootSound, gunAngle], // added gunAngle dependency
  )

  const checkCollisions = useCallback(() => {
    setBullets((prevBullets) => {
      const remainingBullets = [...prevBullets]

      setBirds((prevBirds) => {
        const remainingBirds = [...prevBirds]

        prevBullets.forEach((bullet) => {
          prevBirds.forEach((bird) => {
            const bulletCenterX = bullet.x
            const bulletCenterY = bullet.y
            const birdCenterX = bird.x + (bird.size / 2 / window.innerWidth) * 100
            const birdCenterY = bird.y + (bird.size / 2 / window.innerHeight) * 100

            const distance = Math.sqrt(
              Math.pow(bulletCenterX - birdCenterX, 2) + Math.pow(bulletCenterY - birdCenterY, 2),
            )

            // Collision threshold
            if (distance < 3) {
              // Remove bullet and bird
              const bulletIndex = remainingBullets.findIndex((b) => b.id === bullet.id)
              const birdIndex = remainingBirds.findIndex((b) => b.id === bird.id)

              if (bulletIndex !== -1) remainingBullets.splice(bulletIndex, 1)
              if (birdIndex !== -1) {
                createParticles(bird.x, bird.y)
                setScore((prev) => prev + bird.points)
                remainingBirds.splice(birdIndex, 1)
              }
            }
          })
        })

        return remainingBirds
      })

      return remainingBullets
    })
  }, [])

  const spawnBird = useCallback(() => {
    const side = Math.random() > 0.5 ? "left" : "right"
    const types: ("brown" | "black" | "red")[] = ["brown", "black", "red"]
    const type = types[Math.floor(Math.random() * types.length)]

    const newBird: Bird = {
      id: Date.now() + Math.random(),
      x: side === "left" ? -5 : 105,
      y: Math.random() * 50 + 15,
      speedX: side === "left" ? Math.random() * 1.5 + 0.5 : -(Math.random() * 1.5 + 0.5),
      speedY: (Math.random() - 0.5) * 0.8,
      points:
        type === "red"
          ? Math.floor(Math.random() * 30) + 40
          : type === "black"
            ? Math.floor(Math.random() * 20) + 20
            : Math.floor(Math.random() * 15) + 10,
      size: type === "red" ? 45 : type === "black" ? 35 : 30,
      type,
      wingPhase: Math.random() * Math.PI * 2,
    }
    setBirds((prev) => [...prev, newBird])
  }, [])

  const spawnCloud = useCallback(() => {
    const newCloud: Cloud = {
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 50 + 15,
      size: Math.floor(Math.random() * 50) + 50,
      opacity: Math.random() * 0.5 + 0.5,
      speed: Math.random() * 0.5 + 0.5,
    }
    setClouds((prev) => [...prev, newCloud])
  }, [])

  const updateGame = useCallback(() => {
    // Update birds
    setBirds((prev) =>
      prev
        .map((bird) => ({
          ...bird,
          x: bird.x + bird.speedX,
          y: bird.y + bird.speedY,
          wingPhase: bird.wingPhase + 0.3,
        }))
        .filter((bird) => bird.x > -10 && bird.x < 110),
    )

    setBullets(
      (prev) =>
        prev
          .map((bullet) => ({
            ...bullet,
            x: bullet.x + bullet.speedX, // update horizontal position
            y: bullet.y + bullet.speedY,
          }))
          .filter((bullet) => bullet.y > -5 && bullet.x > -5 && bullet.x < 105), // filter bullets that go off screen horizontally too
    )

    // Update clouds
    setClouds((prev) =>
      prev.map((cloud) => ({
        ...cloud,
        x: cloud.x + cloud.speed,
        x: cloud.x > 110 ? -20 : cloud.x,
      })),
    )

    // Update particles
    setParticles((prev) =>
      prev
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.1,
          life: particle.life - 1,
        }))
        .filter((particle) => particle.life > 0),
    )

    checkCollisions()
  }, [checkCollisions])

  useEffect(() => {
    if (!gameStarted) return

    const gameLoop = () => {
      updateGame()

      if (Math.random() < 0.015) {
        spawnBird()
      }

      if (Math.random() < 0.01) {
        spawnCloud()
      }

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    setTimeout(() => spawnBird(), 500)
    setTimeout(() => spawnBird(), 1500)

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameStarted, updateGame, spawnBird, spawnCloud])

  useEffect(() => {
    if (!gameStarted) return

    let touchStartX = 0
    let touchStartY = 0
    let isTouchRotating = false

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartX = touch.clientX
      touchStartY = touch.clientY

      // Check if touch is in bottom area where gun is located
      const screenHeight = window.innerHeight
      if (touch.clientY > screenHeight * 0.7) {
        isTouchRotating = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchRotating) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX

      // Rotate gun based on horizontal swipe
      if (Math.abs(deltaX) > 10) {
        const rotationSpeed = 0.3
        const newAngle = Math.max(-45, Math.min(45, gunAngle + deltaX * rotationSpeed))
        setGunAngle(newAngle)
        touchStartX = touch.clientX
      }
    }

    const handleTouchEnd = () => {
      isTouchRotating = false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) return

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          setGunAngle((prev) => Math.max(prev - 5, -45))
          break
        case "ArrowRight":
        case "d":
        case "D":
          setGunAngle((prev) => Math.min(prev + 5, 45))
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("touchstart", handleTouchStart, { passive: false })
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [gameStarted, gunAngle])

  const startGame = () => {
    setGameStarted(true)
    setScore(0)
    setBirds([])
    setParticles([])
    setBullets([])
    setClouds([])
  }

  const resetGame = () => {
    setGameStarted(false)
    setScore(0)
    setBirds([])
    setParticles([])
    setBullets([])
    setClouds([])
  }

  const handleGameAreaClick = (e: React.MouseEvent) => {
    if (gameStarted) {
      shootBullet(e.clientX, e.clientY)
    }
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-green-400">
        {clouds.map((cloud) => (
          <CloudSprite key={cloud.id} cloud={cloud} />
        ))}

        <div className="absolute bottom-0 left-0 right-0 h-40">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-600 via-green-500 to-transparent">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute bottom-0"
                style={{
                  left: `${i * 12 + 5}%`,
                  width: "12px",
                  height: `${Math.random() * 60 + 80}px`,
                  background: "linear-gradient(to top, #1a5f1a, #2d7d2d)",
                  clipPath: "polygon(50% 0%, 20% 100%, 80% 100%)",
                }}
              />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-700">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute bottom-0 bg-green-600"
                style={{
                  left: `${i * 2}%`,
                  width: "2px",
                  height: `${Math.random() * 8 + 4}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/20">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Нападение на Птиц
            </h1>
            <p className="text-gray-600 mb-2">🔫 Стреляйте из пулемета по птицам!</p>
            <p className="text-gray-600 mb-2">🔴 Красные птицы = больше очков</p>
            <p className="text-gray-600 mb-6">⚡ Кликайте, чтобы стрелять пулями</p>
            <p className="text-gray-600 mb-6">← → или A/D для поворота пулемета</p> {/* added rotation instructions */}
            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              🎮 Начать игру
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={gameAreaRef}
      className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-green-400 cursor-crosshair select-none"
      onClick={handleGameAreaClick}
    >
      {clouds.map((cloud) => (
        <CloudSprite key={cloud.id} cloud={cloud} />
      ))}

      <div className="absolute bottom-0 left-0 right-0 h-40">
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-600 via-green-500 to-transparent">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: `${i * 12 + 5}%`,
                width: "12px",
                height: `${Math.random() * 60 + 80}px`,
                background: "linear-gradient(to top, #1a5f1a, #2d7d2d)",
                clipPath: "polygon(50% 0%, 20% 100%, 80% 100%)",
              }}
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-700">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-green-600"
              style={{
                left: `${i * 2}%`,
                width: "2px",
                height: `${Math.random() * 8 + 4}px`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border border-white/20">
        <div className="text-xl font-bold text-gray-800">🎯 Очки: {score}</div>
      </div>

      <div className="absolute top-4 right-4">
        <Button
          onClick={resetGame}
          className="bg-white/90 hover:bg-white text-gray-800 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border border-white/20 font-semibold"
        >
          🔄 Новая игра
        </Button>
      </div>

      {birds.map((bird) => (
        <BirdSprite key={bird.id} bird={bird} />
      ))}

      {bullets.map((bullet) => (
        <BulletSprite key={bullet.id} bullet={bullet} />
      ))}

      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.life / particle.maxLife,
          }}
        />
      ))}

      <MachineGun />

      {/* Instructions */}
      {gameStarted && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-center shadow-lg max-w-sm mx-4">
          <p className="text-gray-700 text-sm mb-1">{"Кликайте по экрану, чтобы стрелять!"}</p>
          <p className="text-xs text-gray-600">{"← → или A/D для поворота • Свайп внизу экрана на мобильном"}</p>
        </div>
      )}
    </div>
  )
}
