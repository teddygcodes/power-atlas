"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import type { BuildPhase } from "../../types/timeline";
import type { CampusAssetSpec } from "../../types/campus";
import { CAMPUS_ASSETS, assetsForPhase } from "../../lib/campus/assets";

// Schematic 3D massing of the campus. PURELY cosmetic — it reveals already-known
// assets in build-phase order and carries no dimensions, capacities, or layout
// meaning. frameloop="demand" + shared materials + clamped dpr keep it cheap so it
// never competes with the map.

function AssetMeshes({
  assets,
  materials,
}: {
  assets: CampusAssetSpec[];
  materials: Map<string, THREE.Material>;
}) {
  return (
    <>
      {assets.flatMap((a) =>
        a.positions.map(([x, z], i) => {
          const material = materials.get(a.color);
          const key = `${a.id}-${i}`;
          if (a.shape === "plane") {
            return (
              <mesh
                key={key}
                position={[x, 0, z]}
                rotation={[-Math.PI / 2, 0, 0]}
                material={material}
              >
                <planeGeometry args={[a.size[0], a.size[2]]} />
              </mesh>
            );
          }
          if (a.shape === "cylinder") {
            const h = a.size[1];
            return (
              <mesh key={key} position={[x, h / 2, z]} material={material}>
                <cylinderGeometry args={[a.size[0], a.size[0], h, 16]} />
              </mesh>
            );
          }
          const h = a.size[1];
          return (
            <mesh key={key} position={[x, h / 2, z]} material={material}>
              <boxGeometry args={[a.size[0], h, a.size[2]]} />
            </mesh>
          );
        }),
      )}
    </>
  );
}

export default function Campus3D({
  phase,
  onClose,
}: {
  phase: BuildPhase;
  onClose: () => void;
}) {
  const visible = useMemo(() => assetsForPhase(phase), [phase]);

  // One material per distinct color, shared across all instances; disposed on unmount.
  const materials = useMemo(() => {
    const m = new Map<string, THREE.Material>();
    for (const a of CAMPUS_ASSETS) {
      if (!m.has(a.color)) {
        m.set(
          a.color,
          new THREE.MeshStandardMaterial({
            color: a.color,
            roughness: 0.75,
            metalness: 0.05,
          }),
        );
      }
    }
    return m;
  }, []);
  useEffect(() => () => materials.forEach((mat) => mat.dispose()), [materials]);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-10 w-64 rounded-lg border border-atlas-border bg-atlas-panel/95 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-atlas-border px-3 py-2">
        <p className="text-[11px] uppercase tracking-wider text-atlas-muted">
          Campus Massing (schematic)
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide campus 3D"
          className="text-atlas-dim hover:text-atlas-text"
        >
          ✕
        </button>
      </div>

      <div className="h-52 w-full">
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [18, 14, 18], fov: 34, near: 0.1, far: 200 }}
          onCreated={({ camera }) => camera.lookAt(0, 1, 0)}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[12, 18, 8]} intensity={1.15} />
          <AssetMeshes assets={visible} materials={materials} />
        </Canvas>
      </div>

      <div className="border-t border-atlas-border px-3 py-2">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-atlas-muted">
          Present at this phase
        </p>
        <ul className="flex flex-wrap gap-1">
          {visible.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-1 rounded bg-atlas-grid px-1.5 py-0.5 text-[10px] text-atlas-muted"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: a.color }}
              />
              {a.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-atlas-dim">
          Representative massing for visualization — not an architectural or
          engineering site design. Asset placement and sizing are schematic.
        </p>
      </div>
    </div>
  );
}
