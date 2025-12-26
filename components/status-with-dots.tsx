import { motion } from 'framer-motion'

export function StatusWithDots({ label, reduceMotion }: { label: string; reduceMotion: boolean }) {
  if (reduceMotion) return <span>{label}</span>

  const dot = {
    initial: { opacity: 0.25, y: 0 },
    animate: (i: number) => ({
      opacity: [0.25, 1, 0.25],
      y: [0, -2, 0],
      transition: { duration: 0.9, repeat: Infinity, delay: i * 0.12 },
    }),
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <span className="inline-flex w-[18px] justify-start">
        <motion.span variants={dot} custom={0} initial="initial" animate="animate" className="inline-block">.</motion.span>
        <motion.span variants={dot} custom={1} initial="initial" animate="animate" className="inline-block">.</motion.span>
        <motion.span variants={dot} custom={2} initial="initial" animate="animate" className="inline-block">.</motion.span>
      </span>
    </span>
  )
}




