import { GraphLink, GraphNode } from "@/types/entityGraph";

export interface SimulationOptions {
  repulsion: number;       // Repulsive force between nodes
  springLength: number;    // Ideal edge length
  springStrength: number;  // Edge spring pull
  gravity: number;         // Pull towards center
  damping: number;         // Friction / decay
  dimensions: 2 | 3;
}

export const DEFAULT_SIMULATION_OPTIONS: SimulationOptions = {
  repulsion: 380,
  springLength: 26,
  springStrength: 0.045,
  gravity: 0.025,
  damping: 0.88,
  dimensions: 3,
};

/**
 * Initializes nodes in a 3D Fibonacci spiral sphere to ensure uniform distribution
 * without overlapping or unstable singularities.
 */
export function initializeNodePositions(
  nodes: GraphNode[],
  dimensions: 2 | 3 = 3,
  radius: number = 28
): GraphNode[] {
  const count = nodes.length;
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

  return nodes.map((node, i) => {
    // If node already has valid non-zero positions, keep them
    if (typeof node.x === "number" && typeof node.y === "number" && (dimensions === 2 || typeof node.z === "number")) {
      return {
        ...node,
        vx: node.vx || 0,
        vy: node.vy || 0,
        vz: node.vz || 0,
        radius: node.radius || (node.risk === "critical" ? 1.8 : node.type === "suspect" ? 1.6 : 1.2),
      };
    }

    if (dimensions === 2) {
      const angle = (2 * Math.PI * i) / count;
      const r = radius * (0.4 + 0.6 * Math.sqrt((i + 1) / count));
      return {
        ...node,
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: node.risk === "critical" ? 1.8 : node.type === "suspect" ? 1.6 : 1.2,
      };
    }

    // 3D Fibonacci sphere algorithm
    const yCoord = 1 - (i / Math.max(1, count - 1)) * 2; // y goes from 1 to -1
    const rAtY = Math.sqrt(Math.max(0, 1 - yCoord * yCoord));
    const theta = (2 * Math.PI * i) / phi;

    const x = Math.cos(theta) * rAtY * radius;
    const y = yCoord * radius;
    const z = Math.sin(theta) * rAtY * radius;

    return {
      ...node,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: node.risk === "critical" ? 1.8 : node.type === "suspect" ? 1.6 : 1.2,
    };
  });
}

/**
 * Executes one step of the force-directed physics engine.
 */
export function stepSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  options: SimulationOptions = DEFAULT_SIMULATION_OPTIONS
): GraphNode[] {
  const { repulsion, springLength, springStrength, gravity, damping, dimensions } = options;
  const nodeMap = new Map<string, GraphNode>();
  const is3D = dimensions === 3;

  // Clone nodes to update positions immutably
  const updatedNodes = nodes.map((n) => {
    const clone = { ...n, vx: n.vx || 0, vy: n.vy || 0, vz: n.vz || 0 };
    nodeMap.set(n.id, clone);
    return clone;
  });

  // 1. Node-Node Repulsion (Coulomb's Law with soft core)
  for (let i = 0; i < updatedNodes.length; i++) {
    const n1 = updatedNodes[i];
    for (let j = i + 1; j < updatedNodes.length; j++) {
      const n2 = updatedNodes[j];

      const dx = (n1.x || 0) - (n2.x || 0);
      const dy = (n1.y || 0) - (n2.y || 0);
      const dz = is3D ? (n1.z || 0) - (n2.z || 0) : 0;

      const distSq = dx * dx + dy * dy + dz * dz + 0.1;
      const dist = Math.sqrt(distSq);

      if (dist < 0.001) continue;

      const force = repulsion / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = is3D ? (dz / dist) * force : 0;

      n1.vx! += fx;
      n1.vy! += fy;
      if (is3D) n1.vz! += fz;

      n2.vx! -= fx;
      n2.vy! -= fy;
      if (is3D) n2.vz! -= fz;
    }
  }

  // 2. Link Attraction (Hooke's Spring Law)
  for (const link of links) {
    const source = nodeMap.get(typeof link.source === "string" ? link.source : (link.source as any).id);
    const target = nodeMap.get(typeof link.target === "string" ? link.target : (link.target as any).id);

    if (!source || !target) continue;

    const dx = (target.x || 0) - (source.x || 0);
    const dy = (target.y || 0) - (source.y || 0);
    const dz = is3D ? (target.z || 0) - (source.z || 0) : 0;

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
    const displacement = dist - springLength;
    const force = displacement * springStrength;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = is3D ? (dz / dist) * force : 0;

    source.vx! += fx;
    source.vy! += fy;
    if (is3D) source.vz! += fz;

    target.vx! -= fx;
    target.vy! -= fy;
    if (is3D) target.vz! -= fz;
  }

  // 3. Center Gravity & Position Integration
  for (const node of updatedNodes) {
    // Pull towards center
    node.vx! -= (node.x || 0) * gravity;
    node.vy! -= (node.y || 0) * gravity;
    if (is3D) {
      node.vz! -= (node.z || 0) * gravity;
    } else {
      node.z = 0;
      node.vz = 0;
    }

    // Apply damping
    node.vx! *= damping;
    node.vy! *= damping;
    if (is3D) node.vz! *= damping;

    // Cap maximum speed to prevent erratic jumps
    const maxSpeed = 4.5;
    const currentSpeed = Math.sqrt(
      node.vx! * node.vx! + node.vy! * node.vy! + (is3D ? node.vz! * node.vz! : 0)
    );
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      node.vx! *= scale;
      node.vy! *= scale;
      if (is3D) node.vz! *= scale;
    }

    // Update positions
    node.x = (node.x || 0) + node.vx!;
    node.y = (node.y || 0) + node.vy!;
    if (is3D) {
      node.z = (node.z || 0) + node.vz!;
    } else {
      node.z = 0;
    }
  }

  return updatedNodes;
}

/**
 * Warms up the simulation ahead of rendering so the graph starts in an aesthetically settled state.
 */
export function warmUpSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  iterations: number = 75,
  options: SimulationOptions = DEFAULT_SIMULATION_OPTIONS
): GraphNode[] {
  let currentNodes = initializeNodePositions(nodes, options.dimensions);
  for (let i = 0; i < iterations; i++) {
    currentNodes = stepSimulation(currentNodes, links, options);
  }
  return currentNodes;
}
