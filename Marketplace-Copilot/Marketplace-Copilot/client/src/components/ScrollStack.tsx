import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';

interface CardProps {
    i: number;
    title: string;
    description: string;
    src: string;
    color: string;
    progress: MotionValue<number>;
    range: [number, number];
    targetScale: number;
}

const Card = ({ i, title, description, src, color, progress, range, targetScale }: CardProps) => {
    const container = useRef(null);
    const { scrollYProgress } = useScroll({
        target: container,
        offset: ['start end', 'start start']
    });

    const imageScale = useTransform(scrollYProgress, [0, 1], [1.3, 1]);
    const scale = useTransform(progress, range, [1, targetScale]);

    return (
        <div ref={container} className="h-screen flex items-center justify-center sticky top-0 px-4">
            <motion.div
                style={{ scale, backgroundColor: color, top: `calc(10vh + ${i * 25}px)` }}
                className="flex flex-col md:flex-row relative -top-[20%] h-[500px] w-full max-w-[1000px] rounded-3xl p-8 md:p-12 origin-top border border-white/10 shadow-2xl overflow-hidden"
            >
                <div className="md:w-1/2 flex flex-col justify-center gap-6 z-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-display">{title}</h2>
                    <p className="text-lg text-slate-700 leading-relaxed font-sans">{description}</p>
                    <div className="mt-4">
                        <span className="px-4 py-2 rounded-full border border-slate-900/10 bg-white/50 text-slate-800 text-sm font-medium backdrop-blur-sm">
                            Explore Feature &rarr;
                        </span>
                    </div>
                </div>

                <div className="md:w-1/2 relative h-full rounded-2xl overflow-hidden mt-6 md:mt-0 md:ml-12 shadow-inner border border-slate-900/5">
                    <motion.div style={{ scale: imageScale }} className="w-full h-full">
                        <img
                            src={src}
                            alt={title}
                            className="object-cover w-full h-full"
                        />
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}

interface FeatureItem {
    title: string;
    description: string;
    src: string;
    color: string;
}

export default function ScrollStack({ items }: { items: FeatureItem[] }) {
    const container = useRef(null);
    const { scrollYProgress } = useScroll({
        target: container,
        offset: ['start start', 'end end']
    });

    return (
        <div ref={container} className="relative mt-20">
            {items.map((item, i) => {
                const targetScale = 1 - ((items.length - i) * 0.05);
                return (
                    <Card
                        key={i}
                        i={i}
                        {...item}
                        progress={scrollYProgress}
                        range={[i * (1 / items.length), 1]}
                        targetScale={targetScale}
                    />
                );
            })}
        </div>
    )
}
