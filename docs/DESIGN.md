# Design Document

## Design Philosophy

Minimal
Clean
Distraction Free
Study Focused

---

## Theme

Primary:
#2563EB

Secondary:
#1E293B

Background:
#0F172A

Surface:
#1E293B

Text:
#F8FAFC

Muted Text:
#94A3B8

Success:
#22C55E

Danger:
#EF4444

---

## Typography

Font Family:
Inter

Weights:
400
500
600
700

---

## Layout

### Entry State (before joining)

--------------------------------
|                              |
|        App Title             |
|   [ Display Name Input ]     |
|      [ Continue Button ]     |
|                              |
--------------------------------

### Call State (participants grid)

------------------------------------------------
|  [Tile: Alice]     [Tile: Bob]               |
|                                              |
|  [Tile: Carol]     [Tile: You]               |
------------------------------------------------

Each tile:

- `<video>` element when camera is on (`object-fit: cover`)
- Avatar circle + name fallback when camera is off / stream missing
- Bottom overlay: display name + mic-off icon when muted
- Highlight ring while the participant is speaking

Screen share replaces the grid with a large stage view.

------------------------------------------------
| Mic | Camera | Share | Leave                 |
------------------------------------------------

---

## Tile States

Camera on:
Video visible, name overlaid bottom-left

Camera off:
Avatar initials centered, name below

Muted:
Mic-crossed icon next to name

Speaking:
Colored border/glow around tile

Connecting:
Subtle pulse until `connectionState === 'connected'`

---

## Button States

Active:
Filled

Inactive:
Outlined

Danger (Leave):
Red

---

## Responsive Design

Desktop:
Primary experience — grid reflows per participant count

Tablet:
Supported

Mobile:
Basic support — single-column grid

---

## Animations

Duration:
200ms

Easing:
ease-in-out

Hover:
Scale 1.02

Transitions:
Smooth fade; tiles fade in on join, collapse smoothly on leave
