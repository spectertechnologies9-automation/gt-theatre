import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { stage } from '../lib/stage'

// Procedural velvet curtain. Each curtain is a dense plane whose vertices are
// re-folded every frame: as it gathers toward the wings, the fold depth grows
// (fabric conservation), the hem trails the rail, and the cloth sways with the
// speed of the move. Vertex colours bake occlusion into the troughs and the
// physical material's sheen lobe gives the velvet rim-light.

const velvetNoise = (() => {
  let tex: THREE.DataTexture | null = null
  return () => {
    if (tex) return tex
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        // fine pile noise with faint vertical weave
        const n = Math.random() * 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(x * 1.7 + Math.random()))
        const v = Math.floor(150 + n * 105)
        data[i] = data[i + 1] = data[i + 2] = v
        data[i + 3] = 255
      }
    }
    tex = new THREE.DataTexture(data, size, size)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(10, 18)
    tex.needsUpdate = true
    return tex
  }
})()

type Props = {
  side: -1 | 1 // -1 = left curtain, 1 = right curtain
  width: number // width of one curtain when closed
  height: number
  segX: number
  segY: number
  folds?: number
}

export function Curtain({ side, width, height, segX, segY, folds = 11 }: Props) {
  const mesh = useRef<THREE.Mesh>(null)
  const last = useRef({ open: -1, t: 0, vel: 0 })

  const { geometry, base } = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, segX, segY)
    const pos = g.attributes.position as THREE.BufferAttribute
    const count = pos.count
    const uv = new Float32Array(count * 2) // u: 0 inner edge → 1 outer edge, v: 0 hem → 1 rail
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const xn = (x + width / 2) / width // 0 left → 1 right
      uv[i * 2] = side === -1 ? 1 - xn : xn
      uv[i * 2 + 1] = (y + height / 2) / height
    }
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    return { geometry: g, base: { uv } }
  }, [width, height, segX, segY, side])

  const material = useMemo(() => {
    const noise = velvetNoise()
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#3a52c4'),
      roughness: 0.92,
      roughnessMap: noise,
      bumpMap: noise,
      bumpScale: 0.6,
      sheen: 1,
      sheenRoughness: 0.38,
      sheenColor: new THREE.Color('#b8c6ff'),
      vertexColors: true,
      side: THREE.DoubleSide,
    })
  }, [])

  useFrame((state, delta) => {
    const m = mesh.current
    if (!m) return
    const open = stage.curtain
    const t = state.clock.elapsedTime
    const L = last.current
    const instVel = Math.abs(open - (L.open < 0 ? open : L.open)) / Math.max(delta, 1e-3)
    L.vel += (instVel - L.vel) * Math.min(1, delta * 4)
    const sway = Math.min(1, L.vel * 0.9) * 0.12 + 0.012
    // Only rebuild when the cloth is visibly moving.
    if (Math.abs(open - L.open) < 1e-5 && L.vel < 0.002 && t - L.t < 0.05) return
    L.open = open
    L.t = t

    const pos = geometry.attributes.position as THREE.BufferAttribute
    const col = geometry.attributes.color as THREE.BufferAttribute
    const { uv } = base
    const halfOpening = width // inner edge sits at x = 0 when closed
    const outerX = side * halfOpening
    const count = pos.count
    for (let i = 0; i < count; i++) {
      const u = uv[i * 2]
      const v = uv[i * 2 + 1]
      // Hem trails behind the rail, and the very top moves first.
      const lag = (1 - v) * 0.16
      let o = (open - lag) / (1 - lag)
      o = o < 0 ? 0 : o > 1 ? 1 : o
      o = o * o * (3 - 2 * o)
      // Fraction of the closed width the curtain still occupies.
      const c = 1 - o * 0.8
      // Fold geometry
      const phase = u * folds * Math.PI * 2 + Math.sin(u * 7.0) * 0.6 + Math.sin(u * 17.3 + 1.7) * 0.45
      const gather = 1 - c
      const flare = 1 + (1 - v) * 0.35
      const amp = (0.08 + 0.34 * gather) * flare * (0.72 + 0.18 * Math.sin(u * 23.0) + 0.1 * Math.sin(u * 61.0 + v * 2.0))
      const s = Math.sin(phase)
      const s2 = Math.sin(phase * 2.03 + 1.3) * 0.22
      // Lateral position: inner edge moves toward the wing.
      const x = outerX - side * (1 - u) * width * c + Math.cos(phase) * amp * 0.22 * side
      const motion = Math.sin(t * 1.1 + v * 3.2 + u * 5.0) * sway * (1 - v) * (0.4 + u * 0.6)
      const z = (s + s2) * amp + motion + (1 - v) * gather * 0.18
      // Slight belly at the inner edge while closed
      const y = (v - 0.5) * height + (1 - v) * gather * 0.05 * Math.sin(u * 3.14)
      pos.setXYZ(i, x, y, z)
      // Occlusion in the troughs, brighter on the crests; darker toward the hem.
      const crest = 0.5 + 0.5 * (s + s2 * 0.6)
      const ao = (0.38 + 0.62 * Math.pow(crest, 1.3)) * (0.72 + 0.28 * v)
      col.setXYZ(i, ao, ao * 0.96, ao * 0.96)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return <mesh ref={mesh} geometry={geometry} material={material} castShadow={false} receiveShadow={false} frustumCulled={false} />
}

// Static scalloped valance (pelmet) across the top of the proscenium.
export function Valance({ width, height, swags = 5 }: { width: number; height: number; swags?: number }) {
  const { geometry, material } = useMemo(() => {
    const segX = 220
    const segY = 14
    const g = new THREE.PlaneGeometry(width, height, segX, segY)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const u = (x + width / 2) / width
      const v = (y + height / 2) / height // 0 bottom → 1 top
      const sw = Math.abs(Math.sin(u * swags * Math.PI))
      // Scalloped bottom edge: each swag droops in the middle
      const yy = y + (1 - v) * height * 0.38 * (1 - sw)
      const pleat = Math.sin(u * swags * 14 * Math.PI) * 0.035 * (1 - v * 0.6)
      const belly = sw * 0.22 * (1 - v)
      pos.setXYZ(i, x, yy, pleat + belly)
      const crest = 0.5 + 0.5 * Math.sin(u * swags * 14 * Math.PI)
      const ao = (0.5 + 0.5 * crest) * (0.55 + 0.45 * sw * (1 - v) + 0.3 * v)
      colors[i * 3] = ao
      colors[i * 3 + 1] = ao * 0.95
      colors[i * 3 + 2] = ao * 0.95
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    const noise = velvetNoise()
    const m = new THREE.MeshPhysicalMaterial({
      color: '#3348b2',
      roughness: 0.9,
      roughnessMap: noise,
      bumpMap: noise,
      bumpScale: 0.5,
      sheen: 1,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color('#b8c6ff'),
      vertexColors: true,
      side: THREE.DoubleSide,
    })
    return { geometry: g, material: m }
  }, [width, height, swags])
  return <mesh geometry={geometry} material={material} />
}
