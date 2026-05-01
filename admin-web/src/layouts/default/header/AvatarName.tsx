import React from 'react'

const AvatarName: React.FC<{ name: string }> = ({ name }) => {
  return <span className="cw-avatar-name">{name}</span>
}

export default AvatarName
