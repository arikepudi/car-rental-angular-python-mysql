import base64


def car_image(color: str) -> str:
    """A flat, generated car silhouette — never a third-party stock-photo service.

    Random "seeded" photo APIs (picsum.photos and similar) return photos unrelated to
    the actual thing being depicted; drawing the shape ourselves is correct by
    construction. See references/mock-media.md in the skill for the full rationale.
    """
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#eef1f6"/>
          <stop offset="1" stop-color="#dde3ec"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#bg)"/>
      <ellipse cx="300" cy="330" rx="220" ry="16" fill="rgba(15,23,42,0.15)"/>
      <path d="M120 260
               L150 190
               Q170 160 210 155
               L390 155
               Q430 160 450 190
               L480 260
               L500 260
               Q510 260 510 275
               L510 290
               Q510 300 500 300
               L470 300
               Q470 270 435 270
               Q400 270 400 300
               L200 300
               Q200 270 165 270
               Q130 270 130 300
               L100 300
               Q90 300 90 290
               L90 275
               Q90 260 100 260
               Z"
            fill="{color}" stroke="rgba(15,23,42,0.32)" stroke-width="4" stroke-linejoin="round"/>
      <path d="M200 195 L225 165 Q235 158 250 158 L350 158 Q365 158 375 165 L400 195 Z"
            fill="rgba(255,255,255,0.55)" stroke="rgba(15,23,42,0.25)" stroke-width="2"/>
      <circle cx="180" cy="300" r="32" fill="#1f2937" stroke="rgba(15,23,42,0.4)" stroke-width="3"/>
      <circle cx="180" cy="300" r="13" fill="#9ca3af"/>
      <circle cx="420" cy="300" r="32" fill="#1f2937" stroke="rgba(15,23,42,0.4)" stroke-width="3"/>
      <circle cx="420" cy="300" r="13" fill="#9ca3af"/>
      <rect x="455" y="215" width="16" height="10" rx="2" fill="#fde68a"/>
      <rect x="129" y="215" width="16" height="10" rx="2" fill="#fca5a5"/>
    </svg>"""
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"
