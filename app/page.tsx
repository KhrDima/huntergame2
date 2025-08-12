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
  speedY: number
}

export default function BirdAttackGame() {
  const [gameStarted, setGameStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [birds, setBirds] = useState<Bird[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [gunShooting, setGunShooting] = useState(false)
  const [clouds, setClouds] = useState<Cloud[]>([
    { id: 1, x: 15, y: 8, size: 120, opacity: 0.7, speed: 0.1 },
    { id: 2, x: 65, y: 12, size: 150, opacity: 0.6, speed: 0.15 },
    { id: 3, x: 35, y: 20, size: 100, opacity: 0.8, speed: 0.08 },
    { id: 4, x: 80, y: 25, size: 180, opacity: 0.5, speed: 0.12 },
    { id: 5, x: 10, y: 40, size: 90, opacity: 0.7, speed: 0.09 },
    { id: 6, x: 55, y: 45, size: 140, opacity: 0.6, speed: 0.11 },
  ])
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

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
          transform: `rotate(${bird.speedX > 0 ? 0 : 180}deg)`,
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
      <div className={`transition-transform duration-100 ${gunShooting ? "scale-110" : "scale-100"}`}>
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

  const shootBullet = useCallback((clientX: number, clientY: number) => {
    if (!gameAreaRef.current) return

    const rect = gameAreaRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100

    const newBullet: Bullet = {
      id: Date.now() + Math.random(),
      x: 50, // Start from gun position (center)
      y: 85, // Start from gun position (bottom)
      speedY: -3, // Move upward
    }

    setBullets((prev) => [...prev, newBullet])

    // Gun shooting animation
    setGunShooting(true)
    setTimeout(() => setGunShooting(false), 100)
  }, [])

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
            y: bullet.y + bullet.speedY,
          }))
          .filter((bullet) => bullet.y > -5), // Remove bullets that go off screen
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
  }, [gameStarted, updateGame, spawnBird])

  const startGame = () => {
    setGameStarted(true)
    setScore(0)
    setBirds([])
    setParticles([])
    setBullets([])
  }

  const resetGame = () => {
    setGameStarted(false)
    setScore(0)
    setBirds([])
    setParticles([])
    setBullets([])
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

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 text-center shadow-lg border border-white/20">
        <div className="text-sm font-semibold text-gray-700">🔫 Кликайте по экрану, чтобы стрелять из пулемета!</div>
      </div>
    </div>
  )
}
