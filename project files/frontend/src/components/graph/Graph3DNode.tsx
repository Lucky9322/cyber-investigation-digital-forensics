"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { GraphNode, ENTITY_TYPE_CONFIG } from "@/types/entityGraph";

interface Graph3DNodeProps {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isNeighbor: boolean;
  dimmed: boolean;
  onClick: (node: GraphNode) => void;
  onHover: (node: GraphNode | null) => void;
}

export function Graph3DNode({
  node,
  isSelected,
  isHovered,
  isNeighbor,
  dimmed,
  onClick,
  onHover,
}: Graph3DNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const config = ENTITY_TYPE_CONFIG[node.type] || ENTITY_TYPE_CONFIG.ip;
  const isHighRisk = node.risk === "critical" || node.risk === "high";

  // Position
  const pos: [number, number, number] = [node.x || 0, node.y || 0, node.z || 0];

  // Base scale calculation
  const baseSize = node.risk === "critical" ? 1.6 : node.type === "suspect" ? 1.4 : 1.1;
  const targetScale = isSelected ? baseSize * 1.5 : isHovered ? baseSize * 1.35 : baseSize;

  // Slow rotation animation for subtle cyberpunk dynamism
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.8;
      ringRef.current.rotation.x -= delta * 0.3;
    }
  });

  const nodeColor = useMemo(() => new THREE.Color(config.color), [config.color]);
  const emissiveColor = useMemo(
    () => new THREE.Color(isSelected || isHovered ? config.color : config.emissive),
    [isSelected, isHovered, config.color, config.emissive]
  );

  const opacity = dimmed ? 0.18 : 1.0;

  return (
    <group position={pos}>
      {/* Outer Pulse/Halo Ring for high-risk, hovered, or selected nodes */}
      {(isHighRisk || isSelected || isHovered) && (
        <mesh ref={ringRef} scale={[targetScale * 1.5, targetScale * 1.5, targetScale * 1.5]}>
          <ringGeometry args={[1.0, 1.15, 32]} />
          <meshBasicMaterial
            color={config.color}
            side={THREE.DoubleSide}
            transparent
            opacity={dimmed ? 0.1 : isSelected ? 0.9 : 0.5}
            wireframe={true}
          />
        </mesh>
      )}

      {/* Primary 3D Node Mesh */}
      <mesh
        ref={meshRef}
        scale={[targetScale, targetScale, targetScale]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(node);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onHover(null);
        }}
      >
        {node.type === "suspect" ? (
          <dodecahedronGeometry args={[1, 0]} />
        ) : node.type === "evidence" ? (
          <boxGeometry args={[1.3, 1.3, 1.3]} />
        ) : node.type === "domain" ? (
          <octahedronGeometry args={[1.1, 0]} />
        ) : (
          <icosahedronGeometry args={[1, 1]} />
        )}

        <meshStandardMaterial
          color={nodeColor}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 1.4 : isHovered ? 1.0 : isHighRisk ? 0.7 : 0.35}
          metalness={0.7}
          roughness={0.25}
          wireframe={false}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Floating 3D HTML Label */}
      <Html
        position={[0, targetScale + 1.2, 0]}
        center
        distanceFactor={45}
        occlude={false}
        style={{
          transition: "all 0.2s ease",
          pointerEvents: "none",
          opacity: dimmed ? 0.25 : 1,
        }}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded backdrop-blur-md border text-[11px] font-mono whitespace-nowrap shadow-lg select-none transition-all duration-200 ${
            isSelected
              ? "bg-black/90 border-amber-400 text-amber-300 ring-2 ring-amber-400/50 scale-110"
              : isHovered
              ? "bg-slate-950/95 border-cyan-400 text-white ring-1 ring-cyan-400/50 scale-105"
              : isNeighbor
              ? "bg-slate-900/80 border-slate-600 text-slate-200"
              : "bg-slate-950/75 border-slate-800 text-slate-300"
          }`}
        >
          {/* Node Type Indicator Dot */}
          <span
            className="w-2 h-2 rounded-full inline-block animate-pulse"
            style={{ backgroundColor: config.color }}
          />

          {/* Node Text */}
          <span className="font-semibold tracking-tight">{node.label}</span>

          {/* Threat indicator tag */}
          {node.risk === "critical" && (
            <span className="bg-red-950/80 text-red-400 border border-red-500/40 text-[9px] px-1 rounded uppercase font-bold">
              CRIT
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
