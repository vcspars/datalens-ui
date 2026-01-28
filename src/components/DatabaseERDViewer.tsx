import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MiniMap,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Table as TableIcon, Download, Image, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DatabaseERDViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: number;
}

// Custom node component for database tables
const TableNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-background border-2 border-primary rounded-lg shadow-lg min-w-[250px]">
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-md flex items-center gap-2">
        <TableIcon className="h-4 w-4" />
        <span className="font-semibold">{data.tableName}</span>
      </div>
      <div className="p-3 space-y-1">
        {data.columns?.map((column: any, idx: number) => (
          <div 
            key={idx} 
            className="flex items-center justify-between text-sm py-1 px-2 hover:bg-muted/50 rounded"
          >
            <span className="font-mono text-xs">{column.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5">
                {column.type}
              </Badge>
              {column.isPrimary && (
                <Badge variant="default" className="text-[10px] h-5">PK</Badge>
              )}
              {column.isForeign && (
                <Badge variant="secondary" className="text-[10px] h-5">FK</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNode,
};

// Sample database schema for demonstration
const createSampleNodes = (): Node[] => [
  {
    id: 'users',
    type: 'tableNode',
    position: { x: 100, y: 100 },
    data: {
      tableName: 'users',
      columns: [
        { name: 'id', type: 'INT', isPrimary: true },
        { name: 'email', type: 'VARCHAR', isPrimary: false },
        { name: 'username', type: 'VARCHAR', isPrimary: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimary: false },
      ],
    },
  },
  {
    id: 'orders',
    type: 'tableNode',
    position: { x: 450, y: 100 },
    data: {
      tableName: 'orders',
      columns: [
        { name: 'id', type: 'INT', isPrimary: true },
        { name: 'user_id', type: 'INT', isForeign: true },
        { name: 'total_amount', type: 'DECIMAL', isPrimary: false },
        { name: 'status', type: 'VARCHAR', isPrimary: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimary: false },
      ],
    },
  },
  {
    id: 'products',
    type: 'tableNode',
    position: { x: 100, y: 400 },
    data: {
      tableName: 'products',
      columns: [
        { name: 'id', type: 'INT', isPrimary: true },
        { name: 'name', type: 'VARCHAR', isPrimary: false },
        { name: 'price', type: 'DECIMAL', isPrimary: false },
        { name: 'stock', type: 'INT', isPrimary: false },
      ],
    },
  },
  {
    id: 'order_items',
    type: 'tableNode',
    position: { x: 450, y: 400 },
    data: {
      tableName: 'order_items',
      columns: [
        { name: 'id', type: 'INT', isPrimary: true },
        { name: 'order_id', type: 'INT', isForeign: true },
        { name: 'product_id', type: 'INT', isForeign: true },
        { name: 'quantity', type: 'INT', isPrimary: false },
        { name: 'price', type: 'DECIMAL', isPrimary: false },
      ],
    },
  },
  {
    id: 'categories',
    type: 'tableNode',
    position: { x: 800, y: 250 },
    data: {
      tableName: 'categories',
      columns: [
        { name: 'id', type: 'INT', isPrimary: true },
        { name: 'name', type: 'VARCHAR', isPrimary: false },
        { name: 'description', type: 'TEXT', isPrimary: false },
      ],
    },
  },
];

const createSampleEdges = (): Edge[] => [
  {
    id: 'users-orders',
    source: 'users',
    target: 'orders',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'smoothstep',
    animated: true,
    label: 'has many',
    style: { stroke: 'hsl(var(--primary))' },
  },
  {
    id: 'orders-order_items',
    source: 'orders',
    target: 'order_items',
    type: 'smoothstep',
    animated: true,
    label: 'contains',
    style: { stroke: 'hsl(var(--primary))' },
  },
  {
    id: 'products-order_items',
    source: 'products',
    target: 'order_items',
    type: 'smoothstep',
    animated: true,
    label: 'in',
    style: { stroke: 'hsl(var(--primary))' },
  },
  {
    id: 'products-categories',
    source: 'products',
    target: 'categories',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'smoothstep',
    animated: true,
    label: 'belongs to',
    style: { stroke: 'hsl(var(--primary))' },
  },
];

export default function DatabaseERDViewer({ open, onOpenChange, datasetId }: DatabaseERDViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(createSampleNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(createSampleEdges());
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleExportPNG = () => {
    toast({
      title: "Export Feature",
      description: "Export to PNG will be implemented with actual data",
    });
  };

  const handleExportSVG = () => {
    toast({
      title: "Export Feature",
      description: "Export to SVG will be implemented with actual data",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 rounded-xl">
        <div className="h-full w-full rounded-lg overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap 
              nodeColor={(node) => 'hsl(var(--primary))'}
              className="bg-background border border-border"
            />
            
            <Panel position="top-left" className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 m-2 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Database Schema</h3>
                  <p className="text-xs text-muted-foreground">Dataset ID: {datasetId}</p>
                </div>
              </div>
            </Panel>
            
            <Panel position="top-right" className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 m-2 shadow-lg">
              <div className="text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="h-5">PK</Badge>
                  <span className="text-muted-foreground">Primary Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5">FK</Badge>
                  <span className="text-muted-foreground">Foreign Key</span>
                </div>
              </div>
            </Panel>

            <Panel position="bottom-right" className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 m-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExportPNG}
                  className="gap-2"
                >
                  <Image className="h-4 w-4" />
                  PNG
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExportSVG}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  SVG
                </Button>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </DialogContent>
    </Dialog>
  );
}
