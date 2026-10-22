"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GraphLink, GraphNode } from "@/types/entityGraph";

interface Graph3DEdgesProps {
  links: GraphLink[];
  nodeMap: Map<string, GraphNode>;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
}

export function Graph3DEdges({
  links,
  nodeMap,
  hoveredNodeId,
  selectedNodeId,
}: Graph3DEdgesProps) {
  const pulsesRef = useRef<THREE.InstancedMesh>(null);

  // Pre-calculate edge lines and highlighted status
  const edgeData = useMemo(() => {
    return links.map((link) => {
      const sourceId = typeof link.source === "string" ? link.source : (link.source as any).id;
      const targetId = typeof link.target === "string" ? link.target : (link.target as any).id;

      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);

      const isConnectedToFocus =
        hoveredNodeId === sourceId ||
        hoveredNodeId === targetId ||
        selectedNodeId === sourceId ||
        selectedNodeId === targetId;

      const hasActiveFocus = !!(hoveredNodeId || selectedNodeId);

      return {
        link,
        sourceNode,
        targetNode,
        isConnectedToFocus,
        hasActiveFocus,
      };
    });
  }, [links, nodeMap, hoveredNodeId, selectedNodeId]);

  // Generate Three.js Line geometry points & colors
  const { positions, colors } = useMemo(() => {
    const posArr: number[] = [];
    const colArr: number[] = [];

    const activeColor = new THREE.Color("#00f0ff");
    const normalColor = new THREE.Color("#334155");
    const criticalColor = new THREE.Color("#ff0055");
    const dimmedColor = new THREE.Color("#0f172a");

    edgeData.forEach(({ link, sourceNode, targetNode, isConnectedToFocus, hasActiveFocus }) => {
      if (!sourceNode || !targetNode) return;

      const sx = sourceNode.x || 0;
      const sy = sourceNode.y || 0;
      const sz = sourceNode.z || 0;

      const tx = targetNode.x || 0;
      const ty = targetNode.y || 0;
      const tz = targetNode.z || 0;

      posArr.push(sx, sy, sz, tx, ty, tz);

      let lineColor: THREE.Color;
      if (isConnectedToFocus) {
        lineColor = link.risk === "critical" ? criticalColor : activeColor;
      } else if (hasActiveFocus) {
        lineColor = dimmedColor;
      } else if (link.risk === "critical") {
        lineColor = new THREE.Color("#991b1b");
      } else {
        lineColor = normalColor;
      }

      colArr.push(lineColor.r, lineColor.g, lineColor.b);
      colArr.push(lineColor.r, lineColor.g, lineColor.b);
    });

    return {
      positions: new Float32Array(posArr),
      colors: new Float32Array(colArr),
    };
  }, [edgeData]);

  // Animated packet beads running along edges to show live cyber traffic
  const validEdges = useMemo(() => {
    return edgeData.filter((e) => e.sourceNode && e.targetNode);
  }, [edgeData]);

  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ clock }) => {
    if (!pulsesRef.current || validEdges.length === 0) return;

    const t = clock.getElapsedTime() * 0.8;

    validEdges.forEach((edge, i) => {
      const s = edge.sourceNode!;
      const tr = edge.targetNode!;

      // calculate progress along line with offset per edge
      const progress = (t + i * 0.15) % 1;

      const px = (s.x || 0) + ((tr.x || 0) - (s.x || 0)) * progress;
      const py = (s.y || 0) + ((tr.y || 0) - (s.y || 0)) * progress;
      const pz = (s.z || 0) + ((tr.z || 0) - (s.z || 0)) * progress;

      const scale = edge.isConnectedToFocus ? 0.45 : 0.25;
      dummyMatrix.makeTranslation(px, py, pz);
      dummyMatrix.scale(new THREE.Vector3(scale, scale, scale));
      pulsesRef.current!.setMatrixAt(i, dummyMatrix);
    });

    pulsesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* 3D Line Segments */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.85}
          linewidth={2}
        />
      </lineSegments>

      {/* Cyber Traffic Pulses (Instanced Beads) */}
      {validEdges.length > 0 && (
        <instancedMesh
          ref={pulsesRef}
          args={[undefined, undefined, validEdges.length]}
        >
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.85}
          />
        </instancedMesh>
      )}
    </group>
  );
}
