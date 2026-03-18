const ROLES = {
  asesino: {
    nombre: 'El Asesino',
    desc: 'Cada noche elegís a quién eliminar. Ganá sobreviviendo y reduciendo a los inocentes.',
    villano: true
  },
  secuaz: {
    nombre: 'El Secuaz',
    desc: 'Sabés quién es el Asesino y conocés los roles de todos esta ronda. No matás, pero ganás con él. Usá esa información para protegerlo.',
    villano: true
  },
  testigo: {
    nombre: 'El Testigo',
    desc: 'Esta ronda recibís una pista sobre los villanos. Si morís antes de revelarla, se pierde.',
    villano: false
  },
  cobarde: {
    nombre: 'El Cobarde',
    desc: 'Huiste a tiempo. No podés ser asesinado esta noche, pero tampoco podés votar hoy.',
    villano: false
  },
  sacrificio: {
    nombre: 'El Sacrificio',
    desc: 'Elegís a alguien para proteger. Si el Asesino elige a esa persona esta noche, morís vos en su lugar.',
    villano: false
  },
  medium: {
    nombre: 'El Médium',
    desc: 'Podés invocar el voto de un jugador eliminado. El teléfono te indicará a quién pasárselo.',
    villano: false
  },
  extra: {
    nombre: 'El Extra',
    desc: 'Sin habilidades esta ronda. Sobrevivir ya es bastante.',
    villano: false
  }
};

const ROLES_FALSOS = ['testigo', 'cobarde', 'guardian', 'medium', 'extra'];

function getRolFalso(rolReal) {
  const opciones = ROLES_FALSOS.filter(r => r !== rolReal);
  return opciones[Math.floor(Math.random() * opciones.length)];
}
