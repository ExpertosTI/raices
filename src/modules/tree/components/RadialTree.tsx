import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { FamilyMember } from '../../../types';
import { FAMILY_BRANCHES } from '../../family/constants';
import { MemberDetailModal } from './MemberDetailModal';
import './RadialTree.css';

interface TreeProps {
    members: FamilyMember[];
}

// Convert flat list to hierarchical structure
const buildHierarchy = (members: FamilyMember[]) => {
    // 1. Find root (Patriarch/Matriarch) - Assuming one "Super Root" or first Patriarch
    // For this specific family, we create a virtual root to hold the Patriarchs
    const rootData = {
        name: "Familia Henríquez Cruz",
        id: "root",
        isRoot: true,
        children: [] as any[]
    };

    const memberMap = new Map();
    members.forEach(m => memberMap.set(m.id, { ...m, children: [] }));

    // 2. Link children to parents
    const orphanBranches: any[] = [];

    memberMap.forEach(node => {
        if (node.isPatriarch) {
            rootData.children.push(node);
        } else if (node.parentId && memberMap.has(node.parentId)) {
            memberMap.get(node.parentId).children.push(node);
        } else {
            // If no parent found, attach to Branch Root if possible, otherwise Root
            // For now, simpler fallback:
            if (node.relation === 'SIBLING') {
                rootData.children.push(node);
            } else {
                orphanBranches.push(node);
            }
        }
    });

    // Sort siblings by branch order if possible
    rootData.children.sort((a, b) => {
        const branchA = FAMILY_BRANCHES.find(br => br.name === a.name)?.order || 99;
        const branchB = FAMILY_BRANCHES.find(br => br.name === b.name)?.order || 99;
        return branchA - branchB;
    });

    return rootData;
};

export const RadialTree: React.FC<TreeProps> = ({ members }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

    useEffect(() => {
        if (!members.length || !svgRef.current) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2 - 50;

        // Clear previous SVG
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
                g.attr("transform", event.transform);
            }));

        const g = svg.append("g")
            .attr("transform", `translate(${cx},${cy})`);

        // Data
        const hierarchyData = buildHierarchy(members);
        const root = d3.hierarchy(hierarchyData);

        // Layout
        const tree = d3.tree()
            .size([2 * Math.PI, radius])
            .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

        tree(root);

        // Links
        g.append("g")
            .attr("fill", "none")
            .attr("stroke", "#D4AF37")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(root.links())
            .join("path")
            .attr("d", d3.linkRadial()
                .angle((d: any) => d.x)
                .radius((d: any) => d.y) as any
            );

        // Nodes
        const node = g.append("g")
            .selectAll("g")
            .data(root.descendants())
            .join("g")
            .attr("transform", (d: any) => `
                rotate(${d.x * 180 / Math.PI - 90})
                translate(${d.y},0)
            `);

        // Circles (Nodes)
        node.append("circle")
            .attr("fill", (d: any) => {
                const m = d.data as FamilyMember;
                const branch = FAMILY_BRANCHES.find(b => b.name === m.name) || m.branch;
                return branch?.color || (d.depth === 0 ? "#fff" : "#555");
            })
            .attr("stroke", "#D4AF37")
            .attr("r", (d: any) => d.depth === 0 ? 0 : (6 - d.depth)) // Root invisible
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                const member = d.data as FamilyMember;
                if (!member.isRoot) setSelectedMember(member);
            });

        // Labels
        node.append("text")
            .attr("transform", (d: any) => `rotate(${d.x >= Math.PI ? 180 : 0})`)
            .attr("dy", "0.31em")
            .attr("x", (d: any) => d.x < Math.PI === !d.children ? 6 : -6)
            .attr("text-anchor", (d: any) => d.x < Math.PI === !d.children ? "start" : "end")
            .text((d: any) => (d.data as any).isRoot ? "" : (d.data as any).name)
            .attr("fill", "white")
            .attr("font-size", "10px")
            .clone(true).lower()
            .attr("stroke", "black")
            .attr("stroke-width", 3);

    }, [members]);

    return (
        <div className="radial-tree-container">
            <svg ref={svgRef} className="radial-svg" />
            <MemberDetailModal
                member={selectedMember}
                onClose={() => setSelectedMember(null)}
            />
        </div>
    );
};
