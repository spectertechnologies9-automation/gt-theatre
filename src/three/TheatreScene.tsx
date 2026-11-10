import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, PerformanceMonitor, Sparkles, SpotLight } from '@react-three/drei'
import * as THREE from 'three'
import { Curtain, Valance } from './Curtain'
import { stage, markSceneReady, type Quality } from '../lib/stage'

const STAGE_Y = 0.55 // stage deck height
const OPEN_W = 9 // proscenium opening width
const OPEN_H = 5.7 // proscenium opening height
const CURTAIN_W = OPEN_W / 2 + 0.12
const SCREEN_Z = -2.7

const GOLD = new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.28 })
const GOLD_DARK = new THREE.MeshStandardMaterial({ color: '#8e7042', metalness: 1, roughness: 0.42 })
const WALL = new THREE.MeshStandardMaterial({ color: '#0f1430', roughness: 0.85 })
const BLACK = new THREE.MeshStandardMaterial({ color: '#05060c', roughness: 0.9 })
const PILLAR = new THREE.MeshPhysicalMaterial({ color: '#24307a', roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color('#6f86e0') })

// ———————————————————————————————————————————— screen
function Screen() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime; uniform float uIntensity;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
          void main(){
            vec2 p = vUv - 0.5; p.x *= 2.2;
            float r = length(p);
            float drift = noise(vUv*3.0 + vec2(uTime*0.05, uTime*0.03)) * 0.5 + noise(vUv*7.0 - uTime*0.04)*0.25;
            vec3 core = vec3(0.92, 0.62, 0.4);
            vec3 edge = vec3(0.10, 0.13, 0.32);
            vec3 col = mix(core, edge, smoothstep(0.0, 1.05, r + drift*0.25));
            float flicker = 0.96 + 0.04 * sin(uTime*23.0) * sin(uTime*7.3);
            float frame = smoothstep(0.0, 0.015, vUv.x) * smoothstep(0.0, 0.015, 1.0-vUv.x) * smoothstep(0.0, 0.03, vUv.y) * smoothstep(0.0, 0.03, 1.0-vUv.y);
            gl_FragColor = vec4(col * uIntensity * flicker * frame * 1.25, 1.0);
          }
        `,
        toneMapped: false,
      }),
    [],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uIntensity.value = 0.04 + stage.screen * 0.62
  })
  const h = 3.7
  return (
    <group position={[0, STAGE_Y + 2.75, SCREEN_Z]}>
      <mesh material={mat}>
        <planeGeometry args={[h * 2.2, h]} />
      </mesh>
      {/* masking frame */}
      <mesh position={[0, 0, -0.02]} material={BLACK}>
        <planeGeometry args={[h * 2.2 + 0.5, h + 0.4]} />
      </mesh>
    </group>
  )
}


// Soft additive glow standing in for bloom (robust on every GPU).
function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,220,170,1)')
  grd.addColorStop(0.35, 'rgba(255,170,110,0.35)')
  grd.addColorStop(1, 'rgba(255,140,90,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function ScreenHalo() {
  const tex = useMemo(makeGlowTexture, [])
  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }),
    [tex],
  )
  const sconceMat = useMemo(
    () => new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }),
    [tex],
  )
  useFrame(() => {
    screenMat.opacity = stage.screen * 0.22
    sconceMat.opacity = stage.reveal * 0.55
  })
  const sconces: [number, number, number][] = []
  ;[-1, 1].forEach((s) => [2.6, 5.6, 8.6, 11.6].forEach((z) => sconces.push([s * 6.95, 3.35, z])))
  return (
    <group>
      <mesh position={[0, STAGE_Y + 2.75, SCREEN_Z + 0.4]} material={screenMat}>
        <planeGeometry args={[13, 7]} />
      </mesh>
      {sconces.map((p, i) => (
        <sprite key={i} position={p} scale={[1.3, 1.3, 1]} material={sconceMat} />
      ))}
      {Array.from({ length: 13 }).map((_, i) => (
        <sprite key={'f' + i} position={[(i - 6) * 0.7, STAGE_Y + 0.06, 1.42]} scale={[0.45, 0.45, 1]} material={sconceMat} />
      ))}
    </group>
  )
}

// ———————————————————————————————————————————— architecture
function Proscenium() {
  const pillarX = OPEN_W / 2 + 0.35
  const topY = STAGE_Y + OPEN_H + 0.45
  return (
    <group>
      {/* stage deck */}
      <mesh position={[0, STAGE_Y / 2, -1]} material={BLACK}>
        <boxGeometry args={[OPEN_W + 3, STAGE_Y, 5]} />
      </mesh>
      {/* gold nosing along the stage edge */}
      <mesh position={[0, STAGE_Y - 0.03, 1.52]} material={GOLD}>
        <boxGeometry args={[OPEN_W + 3, 0.06, 0.06]} />
      </mesh>
      <mesh position={[0, STAGE_Y * 0.45, 1.5]} material={GOLD_DARK}>
        <boxGeometry args={[OPEN_W + 3, 0.02, 0.03]} />
      </mesh>
      {/* footlight row */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={i} position={[(i - 6) * 0.7, STAGE_Y + 0.03, 1.38]}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshBasicMaterial color={[3.2, 2.3, 1.3]} toneMapped={false} />
        </mesh>
      ))}
      {/* pillars */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * pillarX, 0, 0.35]}>
          <mesh position={[0, (topY + 0.4) / 2, 0]} material={PILLAR}>
            <boxGeometry args={[0.7, topY + 0.4, 0.6]} />
          </mesh>
          {/* fluted gold inlays */}
          {[-0.2, 0, 0.2].map((dx) => (
            <mesh key={dx} position={[dx, (topY + 0.4) / 2, 0.31]} material={GOLD}>
              <boxGeometry args={[0.025, topY - 0.6, 0.02]} />
            </mesh>
          ))}
          <mesh position={[0, 0.25, 0.02]} material={GOLD_DARK}>
            <boxGeometry args={[0.82, 0.5, 0.66]} />
          </mesh>
          <mesh position={[0, topY - 0.1, 0.02]} material={GOLD}>
            <boxGeometry args={[0.84, 0.16, 0.68]} />
          </mesh>
        </group>
      ))}
      {/* header */}
      <mesh position={[0, topY + 0.55, 0.35]} material={PILLAR}>
        <boxGeometry args={[OPEN_W + 2.2, 1.3, 0.6]} />
      </mesh>
      <mesh position={[0, topY - 0.08, 0.67]} material={GOLD}>
        <boxGeometry args={[OPEN_W + 2.2, 0.08, 0.06]} />
      </mesh>
      <mesh position={[0, topY + 1.18, 0.67]} material={GOLD}>
        <boxGeometry args={[OPEN_W + 2.2, 0.06, 0.06]} />
      </mesh>
      {/* central crest */}
      <mesh position={[0, topY + 0.55, 0.68]} rotation={[0, 0, Math.PI / 4]} material={GOLD}>
        <boxGeometry args={[0.38, 0.38, 0.05]} />
      </mesh>
      <mesh position={[0, topY + 0.55, 0.7]} rotation={[0, 0, Math.PI / 4]} material={PILLAR}>
        <boxGeometry args={[0.26, 0.26, 0.05]} />
      </mesh>
      {/* back wall behind stage */}
      <mesh position={[0, 5, SCREEN_Z - 0.6]} material={BLACK}>
        <planeGeometry args={[18, 12]} />
      </mesh>
    </group>
  )
}

function Room({ quality }: { quality: Quality }) {
  const pilasters = [2.6, 5.6, 8.6, 11.6]
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6]}>
        <planeGeometry args={[16, 20]} />
        {quality === 'high' ? (
          <MeshReflectorMaterial
            resolution={512}
            mirror={0.35}
            blur={[400, 120]}
            mixBlur={1}
            mixStrength={1.6}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#090b16"
            metalness={0.4}
            roughness={0.85}
          />
        ) : (
          <meshStandardMaterial color="#090b16" roughness={0.6} metalness={0.2} />
        )}
      </mesh>
      {/* aisle runner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 7.5]}>
        <planeGeometry args={[1.4, 12]} />
        <meshStandardMaterial color="#0e1230" roughness={0.95} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 7.2, 4, 6]} rotation={[0, -s * Math.PI / 2, 0]} material={WALL}>
            <planeGeometry args={[20, 8]} />
          </mesh>
          {pilasters.map((z) => (
            <group key={z} position={[s * 7.1, 0, z]}>
              <mesh position={[0, 3.6, 0]} material={GOLD_DARK}>
                <boxGeometry args={[0.12, 7.2, 0.28]} />
              </mesh>
              {/* sconce */}
              <mesh position={[-s * 0.12, 3.3, 0]}>
                <cylinderGeometry args={[0.07, 0.12, 0.42, 16, 1, true]} />
                <meshBasicMaterial color={[3.4, 2.4, 1.3]} toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[-s * 0.1, 3.05, 0]} material={GOLD}>
                <cylinderGeometry args={[0.04, 0.05, 0.12, 12]} />
              </mesh>
            </group>
          ))}
          {/* wainscot rail */}
          <mesh position={[s * 7.12, 1.1, 6]} material={GOLD}>
            <boxGeometry args={[0.04, 0.05, 20]} />
          </mesh>
        </group>
      ))}
      {/* ceiling */}
      <mesh position={[0, 8, 6]} rotation={[Math.PI / 2, 0, 0]} material={BLACK}>
        <planeGeometry args={[16, 20]} />
      </mesh>
      {/* ceiling coffer lines */}
      {[1, 4, 7, 10].map((z) => (
        <mesh key={z} position={[0, 7.95, z]} material={GOLD_DARK}>
          <boxGeometry args={[14, 0.04, 0.06]} />
        </mesh>
      ))}
    </group>
  )
}

// Private-cinema recliners, instanced per part.
function Seats() {
  const seatMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#2c3f96',
        roughness: 0.82,
        sheen: 1,
        sheenRoughness: 0.45,
        sheenColor: new THREE.Color('#7d93ea'),
      }),
    [],
  )
  const rows = [
    { z: 4.6, y: 0, n: 4 },
    { z: 7.0, y: 0.32, n: 4 },
  ]
  const placements = rows.flatMap((r) =>
    Array.from({ length: r.n }, (_, i) => {
      const x = (i - (r.n - 1) / 2) * 1.25 + (i >= r.n / 2 ? 0.55 : -0.55)
      return new THREE.Vector3(x, r.y, r.z)
    }),
  )
  const parts: { size: [number, number, number]; offset: [number, number, number]; mat: THREE.Material; round?: boolean }[] = [
    { size: [0.92, 0.42, 0.9], offset: [0, 0.32, 0], mat: seatMat }, // seat
    { size: [0.92, 1.05, 0.28], offset: [0, 0.92, 0.4], mat: seatMat }, // back
    { size: [0.16, 0.62, 0.92], offset: [-0.54, 0.42, 0.02], mat: seatMat }, // arm L
    { size: [0.16, 0.62, 0.92], offset: [0.54, 0.42, 0.02], mat: seatMat }, // arm R
    { size: [0.18, 0.025, 0.86], offset: [-0.54, 0.74, 0.02], mat: GOLD }, // arm trims
    { size: [0.18, 0.025, 0.86], offset: [0.54, 0.74, 0.02], mat: GOLD },
    { size: [0.86, 0.3, 0.2], offset: [0, 1.48, 0.42], mat: seatMat }, // headrest
  ]
  return (
    <group>
      {/* riser for the back row */}
      <mesh position={[0, 0.16, 7.2]} material={BLACK}>
        <boxGeometry args={[12, 0.32, 2.2]} />
      </mesh>
      <mesh position={[0, 0.32, 6.1]} material={GOLD_DARK}>
        <boxGeometry args={[12, 0.02, 0.03]} />
      </mesh>
      {parts.map((p, pi) => (
        <instancedMesh
          key={pi}
          args={[undefined, undefined, placements.length]}
          material={p.mat}
          ref={(m) => {
            if (!m) return
            const o = new THREE.Object3D()
            placements.forEach((v, i) => {
              o.position.set(v.x + p.offset[0], v.y + p.offset[1], v.z + p.offset[2])
              o.updateMatrix()
              m.setMatrixAt(i, o.matrix)
            })
            m.instanceMatrix.needsUpdate = true
          }}
        >
          <boxGeometry args={p.size} />
        </instancedMesh>
      ))}
    </group>
  )
}

// ———————————————————————————————————————————— lights & camera
function Lighting({ quality }: { quality: Quality }) {
  const key = useRef<THREE.SpotLight>(null)
  const foot = useRef<THREE.PointLight>(null)
  const screenL = useRef<THREE.PointLight>(null)
  const sconceL = useRef<THREE.PointLight>(null)
  const sconceR = useRef<THREE.PointLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const house = useRef<THREE.PointLight>(null)
  const beam = useRef<THREE.SpotLight>(null)
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, STAGE_Y + 2.4, 0)
    return o
  }, [])
  const beamTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, STAGE_Y + 2.75, SCREEN_Z)
    return o
  }, [])
  useFrame(() => {
    const r = stage.reveal
    const open = stage.curtain
    if (key.current) key.current.intensity = r * (95 - open * 45)
    if (foot.current) foot.current.intensity = r * 6
    if (screenL.current) screenL.current.intensity = stage.screen * 30
    if (sconceL.current) sconceL.current.intensity = r * 7
    if (sconceR.current) sconceR.current.intensity = r * 7
    if (amb.current) amb.current.intensity = 0.02 + r * 0.08
    if (house.current) house.current.intensity = r * (6 + open * 4)
    if (beam.current) beam.current.intensity = stage.screen * 40
  })
  return (
    <>
      <primitive object={target} />
      <primitive object={beamTarget} />
      <ambientLight ref={amb} intensity={0.02} color="#ffd9c0" />
      <spotLight
        ref={key}
        position={[0, 7.4, 7.5]}
        target={target}
        angle={0.42}
        penumbra={0.85}
        distance={22}
        decay={1.6}
        color="#ffd2a1"
      />
      <pointLight ref={foot} position={[0, STAGE_Y + 0.25, 2.1]} distance={6} decay={1.5} color="#ffb877" />
      <pointLight ref={screenL} position={[0, STAGE_Y + 2.6, SCREEN_Z + 1.6]} distance={14} decay={1.8} color="#ffcf9a" />
      <pointLight ref={house} position={[0, 5.2, 7.2]} distance={9} decay={1.6} color="#ffbf86" />
      <pointLight ref={sconceL} position={[-6.6, 3.3, 5.6]} distance={6} decay={1.8} color="#ffb36b" />
      <pointLight ref={sconceR} position={[6.6, 3.3, 5.6]} distance={6} decay={1.8} color="#ffb36b" />
      {quality === 'high' && (
        <SpotLight
          ref={beam}
          position={[0, 5.6, 13.5]}
          target={beamTarget}
          angle={0.2}
          penumbra={1}
          distance={18}
          attenuation={17}
          anglePower={4}
          radiusTop={0.08}
          radiusBottom={2.2}
          opacity={0.18}
          color="#ffe2b8"
          intensity={0}
        />
      )}
    </>
  )
}

function ReadySignal() {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    requestAnimationFrame(() => markSceneReady())
  })
  return null
}

function CameraRig() {
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  const cur = useRef({ x: 0, y: 0, s: 0 })
  useFrame((_, rawDelta) => {
    // Clamp long frames (tab switches) so damping never snaps.
    const delta = Math.min(rawDelta, 1 / 20)
    const portrait = size.width / size.height < 1
    const persp = camera as THREE.PerspectiveCamera
    const fov = portrait ? 64 : 38
    if (persp.fov !== fov) {
      persp.fov = fov
      persp.updateProjectionMatrix()
    }
    const d = stage.dolly
    // Frame-rate independent exponential damping for pointer and scroll.
    const k = 1 - Math.exp(-delta * 2.2)
    const ks = 1 - Math.exp(-delta * 4.5)
    cur.current.x += (stage.pointerX - cur.current.x) * k
    cur.current.y += (stage.pointerY - cur.current.y) * k
    cur.current.s += (stage.scroll - cur.current.s) * ks
    const s = cur.current.s
    const baseZ = portrait ? 14.5 : 11.2
    const z = baseZ - d * (portrait ? 2.4 : 2.6) - s * (portrait ? 5.5 : 5.2)
    const y = 2.15 + (1 - d) * 0.35 - s * 0.25
    camera.position.set(cur.current.x * 0.35, y + cur.current.y * 0.18, z)
    look.set(cur.current.x * 0.12, STAGE_Y + 2.45 + s * 0.2, 0)
    camera.lookAt(look)
  })
  return null
}

function Scene({ quality }: { quality: Quality }) {
  const curtainY = STAGE_Y + OPEN_H / 2
  const segX = quality === 'high' ? 170 : 96
  const segY = quality === 'high' ? 44 : 26
  return (
    <>
      <color attach="background" args={['#06070d']} />
      <fog attach="fog" args={['#06070d', 14, 30]} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.2} color="#ffd8a8" position={[0, 6, 6]} scale={[10, 2, 1]} />
        <Lightformer intensity={1.2} color="#ff9c6a" position={[-6, 2, 3]} scale={[3, 6, 1]} />
        <Lightformer intensity={1.2} color="#ff9c6a" position={[6, 2, 3]} scale={[3, 6, 1]} />
        <Lightformer intensity={0.6} color="#24357a" position={[0, -2, 0]} scale={[12, 2, 1]} />
      </Environment>
      <Lighting quality={quality} />
      <CameraRig />
      <ReadySignal />
      <Room quality={quality} />
      <Proscenium />
      <Screen />
      <group position={[0, curtainY, 0.12]}>
        <Curtain side={-1} width={CURTAIN_W} height={OPEN_H} segX={segX} segY={segY} />
        <Curtain side={1} width={CURTAIN_W} height={OPEN_H} segX={segX} segY={segY} />
      </group>
      <group position={[0, STAGE_Y + OPEN_H - 0.15, 0.32]}>
        <Valance width={OPEN_W + 0.6} height={1.15} swags={5} />
      </group>
      <Seats />
      <Sparkles
        count={quality === 'high' ? 160 : 70}
        scale={[9, 5.5, 13]}
        position={[0, 3.4, 5]}
        size={quality === 'high' ? 2.2 : 3}
        speed={0.18}
        opacity={0.55}
        noise={0.6}
        color="#e9c98f"
      />
      <ScreenHalo />
    </>
  )
}

export default function TheatreScene({ quality, active }: { quality: Quality; active: boolean }) {
  const max = quality === 'high' ? 1.75 : 1.25
  const [dpr, setDpr] = useState(Math.min(max, window.devicePixelRatio || 1))
  return (
    <Canvas
      className="theatre-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={dpr}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [0, 2.4, 11] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
      aria-hidden="true"
    >
      {/* Lower the resolution when the frame rate drops instead of stuttering. */}
      <PerformanceMonitor
        flipflops={3}
        onIncline={() => setDpr(Math.min(max, window.devicePixelRatio || 1))}
        onDecline={() => setDpr((d) => Math.max(0.85, d - 0.35))}
        onFallback={() => setDpr(1)}
      />
      <Scene quality={quality} />
    </Canvas>
  )
}
