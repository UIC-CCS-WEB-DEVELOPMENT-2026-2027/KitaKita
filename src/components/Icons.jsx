/*
 * =============================================================================
 * FILE OVERVIEW: Icons.jsx
 * =============================================================================
 * WHAT IT DOES:
 *   Provides three small SVG icon components (EyeIcon, EyeOffIcon, LogOutIcon)
 *   built on one shared wrapper component called Icon.
 *
 * WHERE IT FITS:
 *   It is a shared UI utility file. Other components import the icons they need
 *   (for example AccountSettings imports LogOutIcon; password fields presumably
 *   use the eye icons for show/hide). Centralising them keeps the SVG settings
 *   (size, stroke, accessibility attributes) identical everywhere.
 *
 * PRIMARY REACT MECHANICS:
 *   - Props received by Icon: children (the SVG shapes placed between its tags)
 *     and size (defaults to 20 through a default parameter value).
 *   - Props passed: the three exported icons pass shapes as children, and
 *     LogOutIcon also passes size={18}.
 *   - Composition pattern: one wrapper component + many small specialised ones.
 *   - No state, no hooks, no .map() or .filter().
 *   - Accessibility: aria-hidden="true" and focusable="false" because the icons
 *     are decorative (text labels exist beside them).
 *   - stroke="currentColor" makes the icon inherit the surrounding text colour.
 * =============================================================================
 */

// Small stroke icons. Decorative: every control that uses one also has a text label.
// Wrapper component Icon; children is whatever JSX sits between <Icon> and </Icon>, and size defaults to 20 if the parent does not pass one.
function Icon({ children, size = 20 }) {
  // Return the SVG markup.
  return (
    // Root SVG element that frames every icon.
    <svg
      // Width in pixels comes from the size prop.
      width={size}
      // Height equals width so the icon is square.
      height={size}
      // Internal 24 by 24 coordinate system, which scales to whatever size is set.
      viewBox="0 0 24 24"
      // No fill colour, so only outlines are drawn.
      fill="none"
      // Outline colour inherits the current text colour via currentColor.
      stroke="currentColor"
      // Outline thickness in viewBox units.
      strokeWidth="2"
      // Rounded line ends.
      strokeLinecap="round"
      // Rounded corners where lines join.
      strokeLinejoin="round"
      // Hides the icon from screen readers because it is decorative.
      aria-hidden="true"
      // Stops the SVG from receiving keyboard focus in older browsers.
      focusable="false"
    // End of the opening svg tag.
    >
      {/* Render the shapes passed in from the specific icon component. */}
      {children}
    {/* Close the svg element. */}
    </svg>
  // Close the parentheses around the returned JSX.
  )
// Close the Icon function.
}

// Export EyeIcon, a function component with no props that returns an Icon (default size 20).
export const EyeIcon = () => (
  // Use the Icon wrapper; the shapes inside become its children prop.
  <Icon>
    {/* Path drawing the outline of an eye. */}
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    {/* Circle drawing the pupil at the centre (12, 12) with radius 3. */}
    <circle cx="12" cy="12" r="3" />
  {/* Close the Icon wrapper. */}
  </Icon>
// Close the arrow function's parentheses.
)

// Export EyeOffIcon, the "hidden" eye variant (an eye with a slash through it).
export const EyeOffIcon = () => (
  // Use the Icon wrapper with default size.
  <Icon>
    {/* Diagonal slash line across the icon. */}
    <path d="M3 3l18 18" />
    {/* Upper-right part of the eye outline. */}
    <path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9" />
    {/* Lower-left part of the eye outline. */}
    <path d="M6.6 6.7C3.9 8.4 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8" />
    {/* Small arc representing the pupil. */}
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  {/* Close the Icon wrapper. */}
  </Icon>
// Close the arrow function's parentheses.
)

// Export LogOutIcon, the door-and-arrow icon used on the Log out button.
export const LogOutIcon = () => (
  // Use the Icon wrapper with size 18 passed as a prop, so it is slightly smaller than the default.
  <Icon size={18}>
    {/* Path drawing the open door frame. */}
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    {/* Path drawing the arrow head pointing out. */}
    <path d="M16 17l5-5-5-5" />
    {/* Path drawing the arrow shaft. */}
    <path d="M21 12H9" />
  {/* Close the Icon wrapper. */}
  </Icon>
// Close the arrow function's parentheses.
)