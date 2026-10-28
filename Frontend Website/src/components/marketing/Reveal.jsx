import { useInView } from '../../hooks/useInView'

function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  y = 22,
}) {
  const { ref, inView } = useInView()

  return (
    <Tag
      ref={ref}
      className={`reveal-base ${inView ? 'reveal-in' : ''} ${className}`}
      style={{
        '--reveal-delay': `${delay}ms`,
        '--reveal-y': `${y}px`,
      }}
    >
      {children}
    </Tag>
  )
}

export default Reveal
