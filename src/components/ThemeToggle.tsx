import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Alterna claro/escuro; a escolha fica salva (o script em Base.astro aplica antes de pintar). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('tema', next ? 'escuro' : 'claro')
    } catch {
      // storage indisponível: vale só para esta visita
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
