// A-Frame JSX type declarations for WebXR/VR components
import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        embedded?: boolean | string;
        'vr-mode-ui'?: string;
        [key: string]: unknown;
      };
      'a-sky': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        color?: string;
        src?: string;
        [key: string]: unknown;
      };
      'a-plane': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        position?: string;
        rotation?: string;
        width?: string;
        height?: string;
        color?: string;
        [key: string]: unknown;
      };
      'a-box': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        position?: string;
        rotation?: string;
        width?: string;
        height?: string;
        depth?: string;
        color?: string;
        animation?: string;
        [key: string]: unknown;
      };
      'a-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
        position?: string;
        rotation?: string;
        color?: string;
        align?: string;
        width?: string;
        'wrap-count'?: string;
        [key: string]: unknown;
      };
      'a-entity': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        position?: string;
        rotation?: string;
        light?: string;
        camera?: string;
        'look-controls'?: string;
        'wasd-controls'?: string;
        [key: string]: unknown;
      };
      'a-camera': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        position?: string;
        [key: string]: unknown;
      };
    }
  }
}

export {};
