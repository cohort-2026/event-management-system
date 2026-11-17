interface EventArtworkProps {
  title: string;
  category?: string;
  bannerImageUrl?: string | null;
  className?: string;
}

const backgrounds: Record<string, string> = {
  technology: 'linear-gradient(115deg, #ed174c 0%, #ff6417 100%)',
  networking: 'linear-gradient(115deg, #ff8900 0%, #e91e42 100%)',
  training: 'linear-gradient(115deg, #079b6d 0%, #078f92 100%)',
  workshop: 'linear-gradient(115deg, #9226c8 0%, #ed2b91 100%)',
  'company activity': 'linear-gradient(180deg, #22201f 0%, #393533 100%)',
  online: 'linear-gradient(115deg, #1388e9 0%, #6259ec 100%)',
};

export default function EventArtwork({
  title,
  category = '',
  bannerImageUrl,
  className = '',
}: EventArtworkProps) {
  const background = backgrounds[category.toLowerCase()] ?? backgrounds.technology;

  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background }}>
      {bannerImageUrl && (
        <img src={bannerImageUrl} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
      )}
      {!bannerImageUrl && (
        <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
          <span className="absolute -right-4 -top-8 h-24 w-24 rounded-full bg-white/30" />
          <span className="absolute -bottom-14 left-[36%] h-36 w-36 rounded-full bg-black/20" />
          <span className="absolute -bottom-10 -left-7 h-24 w-24 rounded-full bg-amber-300/75" />
        </div>
      )}
      {bannerImageUrl && <div className="absolute inset-0 z-0 bg-black/15" />}
      <div className="relative z-10 flex h-full items-end p-4 sm:p-5">
        <p className="max-w-[90%] text-lg font-black leading-tight text-white drop-shadow sm:text-xl">
          {title}
        </p>
      </div>
    </div>
  );
}
