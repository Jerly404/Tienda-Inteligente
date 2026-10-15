import { BadRequestException } from '@nestjs/common';

export type DeliveryPolygon = { type: 'Polygon'; coordinates: [number, number][][] };

export function parseDeliveryPolygon(value?: string): DeliveryPolygon | undefined {
  if (!value) throw new BadRequestException('Marca el perímetro de reparto en el mapa.');
  let parsed: unknown;
  try { parsed = JSON.parse(value); }
  catch { throw new BadRequestException('La zona de reparto seleccionada no tiene un formato válido.'); }
  if (!parsed || typeof parsed !== 'object' || (parsed as {type?:unknown}).type !== 'Polygon') throw new BadRequestException('Selecciona una zona de reparto en el mapa.');
  const coordinates=(parsed as {coordinates?:unknown}).coordinates;
  if(!Array.isArray(coordinates)||coordinates.length!==1||!Array.isArray(coordinates[0]))throw new BadRequestException('La zona debe formar un único perímetro.');
  const ring=coordinates[0] as unknown[];
  if(ring.length<4||ring.length>51)throw new BadRequestException('Marca entre 3 y 50 puntos para definir la zona.');
  const points:[number,number][]=[];
  for(const point of ring){
    if(!Array.isArray(point)||point.length!==2||typeof point[0]!=='number'||typeof point[1]!=='number'||!Number.isFinite(point[0])||!Number.isFinite(point[1])||point[0]<-180||point[0]>180||point[1]<-90||point[1]>90)throw new BadRequestException('La zona contiene coordenadas no válidas.');
    points.push([point[0],point[1]]);
  }
  const first=points[0],last=points.at(-1)!;
  if(first[0]!==last[0]||first[1]!==last[1])throw new BadRequestException('Cierra el perímetro de reparto en el mapa.');
  const distinct=new Set(points.slice(0,-1).map(point=>`${point[0]},${point[1]}`));
  if(distinct.size<3)throw new BadRequestException('La zona debe incluir al menos tres puntos distintos.');
  return {type:'Polygon',coordinates:[points]};
}
