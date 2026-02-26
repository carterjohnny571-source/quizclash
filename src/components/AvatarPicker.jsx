const TOTAL_AVATARS = 26

export const AVATAR_LIST = Array.from({ length: TOTAL_AVATARS }, (_, i) => i + 1)

export function getAvatarUrl(avatarId) {
  if (!avatarId) return null
  return `/avatars/avatar_${avatarId}.jpg`
}

export default function AvatarPicker({ selected, onSelect, takenAvatars = [] }) {
  return (
    <div className="w-full">
      <p className="text-gray-400 text-sm text-center mb-3">Choose your avatar</p>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[280px] overflow-y-auto p-1">
        {AVATAR_LIST.map(id => {
          const isTaken = takenAvatars.includes(id)
          const isSelected = selected === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => !isTaken && onSelect(id)}
              disabled={isTaken}
              className={`
                relative aspect-square rounded-xl overflow-hidden
                transition-all duration-200 cursor-pointer
                ${isSelected
                  ? 'ring-3 ring-quiz-green scale-105 shadow-[0_0_15px_rgba(46,204,113,0.5)]'
                  : isTaken
                    ? 'opacity-30 cursor-not-allowed grayscale'
                    : 'hover:ring-2 hover:ring-white/50 hover:scale-105'
                }
              `}
            >
              <img
                src={getAvatarUrl(id)}
                alt={`Avatar ${id}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isTaken && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-black/70 px-2 py-0.5 rounded">TAKEN</span>
                </div>
              )}
              {isSelected && (
                <div className="absolute bottom-0 inset-x-0 bg-quiz-green/90 text-white text-xs font-bold text-center py-0.5">
                  YOU
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
