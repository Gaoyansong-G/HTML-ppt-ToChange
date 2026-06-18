import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

// Register GSAP plugins when this module is imported
// Additional plugins (Draggable, MotionPathPlugin, Flip) can be registered here later
gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
export default gsap;
