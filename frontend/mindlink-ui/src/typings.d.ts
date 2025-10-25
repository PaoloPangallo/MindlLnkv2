/* Tipi custom per Three.js extensions */
declare module 'three/examples/jsm/renderers/CSS2DRenderer.js' {
  import { Camera, Object3D, Scene, WebGLRenderer } from 'three';
  export class CSS2DObject extends Object3D {
    constructor(element: HTMLElement);
    element: HTMLElement;
  }
  export class CSS2DRenderer {
    constructor();
    domElement: HTMLElement;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
  }
}
