"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Graph3DNode } from "./Graph3DNode";
import { Graph3DEdges } from "./Graph3DEdges";
import { GraphLink, GraphNode } from "@/types/entityGraph";

interface Graph3DCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  focusTargetNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  onHoverNode: (node: GraphNode | null) => void;
  autoRotate?: boolean;
}

// Camera flight controller to smoothly lerp to selected/searched target node
function CameraFlightController({
  focusNode,
  controlsRef,
}: {
  focusNode: GraphNode | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const targetPos = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (focusNode) {
      targetPos.current = new THREE.Vector3(focusNode.x || 0, focusNode.y || 0, focusNode.z || 0);
    }
  }, [focusNode]);

  useFrame(() => {
    if (!controlsRef.current || !targetPos.current) return;

    const currentTarget = controlsRef.current.target;
    // Lerp controls target towards the focused node
    currentTarget.lerp(targetPos.current, 0.08);

    // Stop lerp when close enough
    if (currentTarget.distanceTo(targetPos.current) < 0.05) {
      targetPos.current = null;
    }
  });

  return null;
}

export function Graph3DCanvas({
  nodes,
  links,
  selectedNode,
  hoveredNode,
  focusTargetNode,
  onSelectNode,
  onHoverNode,
  autoRotate = false,
}: Graph3DCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Map of node IDs to nodes
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Set of neighboring node IDs to highlight
  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    const activeId = hoveredNode?.id || selectedNode?.id;
    if (!activeId) return set;

    links.forEach((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      if (s === activeId) set.add(t);
      if (t === activeId) set.add(s);
    });
    return set;
  }, [links, hoveredNode, selectedNode]);

  const hasActiveFocus = !!(hoveredNode || selectedNode);

  return (
    <div className="w-full h-full relative select-none bg-[#07080c] overflow-hidden">
      <Canvas
        camera={{ position: [0, 24, 55], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerDown={(e) => {
          // If clicked directly on canvas background (not on a 3D node)
          if ((e.target as HTMLElement).tagName === "CANVAS") {
            onSelectNode(null);
          }
        }}
      >
        {/* Deep Cyber Space Fog */}
        <color attach="background" args={["#07080c"]} />
        <fog attach="fog" args={["#07080c", 40, 160]} />

        {/* Ambient & Lighting Setup */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[30, 40, 20]} intensity={1.5} color="#e0f2fe" />
        <pointLight position={[-30, -20, -20]} intensity={1.0} color="#00f0ff" />
        <pointLight position={[20, -20, 20]} intensity={0.8} color="#a855f7" />

        {/* Cyber Stars / Cosmic Particle Dust */}
        <Stars radius={90} depth={50} count={1400} factor={4} saturation={0.5} fade speed={1} />

        {/* Cyber Coordinate Plane Floor */}
        <gridHelper
          args={[140, 35, "#00f0ff", "#1e293b"]}
          position={[0, -20, 0]}
        />

        {/* Camera Flight Controller */}
        <CameraFlightController focusNode={focusTargetNode} controlsRef={controlsRef} />

        {/* 3D Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.8}
          zoomSpeed={1.0}
          panSpeed={0.8}
          minDistance={8}
          maxDistance={140}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
        />

        {/* Render 3D Edges */}
        <Graph3DEdges
          links={links}
          nodeMap={nodeMap}
          hoveredNodeId={hoveredNode?.id || null}
          selectedNodeId={selectedNode?.id || null}
        />

        {/* Render 3D Entity Nodes */}
        <group>
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isNeighbor = neighborIds.has(node.id);
            const dimmed = hasActiveFocus && !isSelected && !isHovered && !isNeighbor;

            return (
              <Graph3DNode
                key={node.id}
                node={node}
                isSelected={isSelected}
                isHovered={isHovered}
                isNeighbor={isNeighbor}
                dimmed={dimmed}
                onClick={onSelectNode}
                onHover={onHoverNode}
              />
            );
          })}
        </group>
      </Canvas>
    </div>
  );
}
