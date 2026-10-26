/*
 * =============================================================================
 * FILE OVERVIEW: useForm.js (hooks/useForm.js)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * useForm.js defines TWO custom hooks for form handling:
 *   1. useForm(initial, validate, onEdit)
 *        A small form helper. It owns the form's state (the typed values,
 *        which fields the user has "touched", and errors reported by the
 *        "server"), computes validation errors from the values, and gives the
 *        form component ready-made props for its inputs.
 *   2. useFocusWhenIdle(busy)
 *        Moves keyboard focus to a field that needs fixing, but only AFTER the
 *        form stops being busy (inputs inside a disabled <fieldset> cannot be
 *        focused, so focus has to wait).
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   validation.js    supplies the validator functions (they return '' or a message).
 *   hooks/useForm.js <-- YOU ARE HERE: turns those validators into form state.
 *   components/Auth.jsx (login / sign-up) and probably Settings.jsx (account
 *   settings) are the likely callers; check their imports to confirm. A form
 *   component calls useForm(...) and receives { values, errors, error, field,
 *   setValue, touch, touchAll, setServerError } to wire up its inputs, error
 *   messages and submit handler. The component's `validate` function is where
 *   validators.email(...), validators.newPassword(...), etc. are used.
 *   State flow: the state lives INSIDE the component that calls useForm
 *   (each call creates its own separate useState slots). Typing in an input
 *   -> onChange -> setValue -> setValues -> re-render -> new `values` and
 *   recomputed `errors`.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * STATE (useState), three separate pieces:
 *   - values       : { fieldName: typedText } for every input; starts as `initial`.
 *   - touched      : { fieldName: true } for fields the user has left once (or all, after submit).
 *   - serverErrors : { fieldName: 'message' } for problems only a backend can know.
 * DERIVED VALUE (useMemo):
 *   - errors is NOT state. It is computed from `values` by calling validate(values),
 *     and cached with useMemo so it is recalculated only when `validate` or
 *     `values` changes. (Defense note: if the caller passes a NEW validate
 *     function on every render, the memo recalculates on every render; that
 *     is why callers should keep validate stable or accept the extra work.)
 * CALLBACK MEMOISATION (useCallback):
 *   - setValue, touch, touchAll, setServerError keep the same function
 *     identity between renders unless their dependencies change.
 * REF + EFFECT (useRef, useEffect):
 *   - useFocusWhenIdle stores the id to focus in a ref (a value that persists
 *     across renders WITHOUT causing a re-render) and uses an effect that runs
 *     when `busy` changes.
 * FUNCTIONAL STATE UPDATES:
 *   - setX((previous) => next) always works from the latest state and builds a
 *     NEW object with spread syntax; state is never mutated directly.
 * ARRAY / OBJECT ITERATION:
 *   - Object.keys(values).map(...) + Object.fromEntries(...): build a
 *     { key: true } object for every field (used by touchAll).
 *   - No .filter() in this file.
 * PROPS / ARGUMENTS:
 *   - These are hooks, not components, so they take ARGUMENTS rather than props.
 *     `field(name)` RETURNS an object of props ({ value, onChange, onBlur })
 *     that the component spreads onto an <input>.
 * =============================================================================
 */

// Import five React hooks: useCallback (keep a stable function), useEffect (side effects), useMemo (cache a computed value), useRef (persistent box that does not re-render), useState (state).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Original comment kept: the heading of the explanation of this helper.
// Small form helper.
// Original comment kept: errors are computed from values on every change, so they update as you type.
//  - errors are derived from the values on every render, so they update as you type
// Original comment kept: an error appears only after the field was touched or the form was submitted.
//  - an error is only SHOWN once its field has been touched (left once) or the form was submitted
// Original comment kept: serverErrors are for things only a backend can know.
//  - serverErrors hold problems only the "server" can know (e.g. email already registered)
// Export the form hook. Arguments: `initial` = starting values object (e.g. { email: '', password: '' }); `validate` = function taking values and returning an errors object; `onEdit` = optional callback run on every edit (for example to clear a form-level error message).
export function useForm(initial, validate, onEdit) {
  // State 1: `values` holds what is typed in every field; setValues replaces it; the starting value is `initial`.
  const [values, setValues] = useState(initial)
  // State 2: `touched` records which fields the user has already left; it starts as an empty object (nothing touched).
  const [touched, setTouched] = useState({})
  // State 3: `serverErrors` holds messages set after a (fake) server call, per field; starts empty.
  const [serverErrors, setServerErrors] = useState({})

  // Derived data: run validate(values) to get an errors object; useMemo caches the result and re-runs only when `validate` or `values` changes (the dependency array).
  const errors = useMemo(() => validate(values), [validate, values])

  // Define setValue wrapped in useCallback so its identity stays the same unless `onEdit` changes; it updates one field.
  const setValue = useCallback(
    // The function takes the field's name (e.g. 'email') and its new value.
    (name, value) => {
      // Functional update: take the latest values `v`, copy them with spread, and overwrite only [name] (a computed property key) with the new value.
      setValues((v) => ({ ...v, [name]: value }))
      // When the user edits a field, clear that field's server error: if one exists, return a copy with it blanked; otherwise return the SAME object `s` so React skips an unnecessary re-render.
      setServerErrors((s) => (s[name] ? { ...s, [name]: '' } : s))
      // If the caller supplied an onEdit callback, call it (the `if` prevents an error when it is undefined).
      if (onEdit) onEdit()
    // Close the callback function.
    },
    // Dependency array for useCallback: recreate setValue only if `onEdit` changes.
    [onEdit]
  // Close the useCallback call.
  )

  // Define touch (stable, via useCallback) to mark one field as touched, usually when the user leaves it (blur).
  const touch = useCallback((name) => {
    // Functional update: if the field is already touched, return the same object `t` (no re-render); otherwise return a copy with [name] set to true.
    setTouched((t) => (t[name] ? t : { ...t, [name]: true }))
  // Empty dependency array: this function never needs to be recreated (it only uses the state setter).
  }, [])

  // Define touchAll (stable unless `values` changes) to mark EVERY field as touched, used on submit so all errors become visible at once.
  const touchAll = useCallback(() => {
    // Object.keys(values) lists the field names; .map() turns each name k into a [k, true] pair; Object.fromEntries() builds one object like { email: true, password: true }.
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])))
  // Dependency array: touchAll reads `values` (for its keys), so it must be recreated when `values` changes.
  }, [values])

  // Define setServerError (stable) to attach a server-side message to one field, for example "email already registered".
  const setServerError = useCallback((name, message) => {
    // Functional update: copy the existing server errors and set/overwrite the message for this field name.
    setServerErrors((s) => ({ ...s, [name]: message }))
  // Empty dependency array: nothing outside the setter is used.
  }, [])

  // Define error(name): returns the message to SHOW for a field. Reading left to right: show the validation error only if the field was touched; otherwise fall back to the server error; otherwise an empty string.
  const error = (name) => (touched[name] && errors[name]) || serverErrors[name] || ''

  // Original comment kept: field() builds the props for a controlled input (an input whose value comes from React state).
  // Props for a controlled text input.
  // Define field(name): returns an object of props that the component spreads onto an input, e.g. <input {...form.field('email')} />.
  const field = (name) => ({
    // value: the input always displays what is in state (this is what makes it a "controlled" input).
    value: values[name],
    // onChange: each keystroke calls setValue with the field name and the text typed (e.target.value), which updates state and re-renders.
    onChange: (e) => setValue(name, e.target.value),
    // onBlur: when the user leaves the input, mark the field as touched so its error can appear.
    onBlur: () => touch(name),
  // Close the returned props object.
  })

  // Return everything the form component needs: the state (values), the validation results (errors, the visible-error helper error), the input-props builder (field), and the action functions.
  return { values, errors, error, field, setValue, touch, touchAll, setServerError }
// Close the useForm function.
}

// Original comment kept: why this second hook exists.
// Inputs inside a disabled <fieldset> cannot take focus, so after a failed submit we
// Original comment kept (continued): focus must wait until the form is enabled again.
// wait until the form is enabled again before moving focus to the field that needs fixing.
// Export the second hook. Argument: `busy` = true while the form is submitting (disabled), false when idle.
export function useFocusWhenIdle(busy) {
  // useRef creates a persistent box { current: null } that survives re-renders; changing .current does NOT cause a re-render. It will hold the DOM id of the field to focus.
  const target = useRef(null)
  // Register an effect that runs after render whenever `busy` changes (see the dependency array).
  useEffect(() => {
    // Only act when the form is idle AND a field id has been requested (target.current is not null).
    if (!busy && target.current) {
      // Find the element by id and focus it; the optional chaining ?. avoids an error if no element has that id.
      document.getElementById(target.current)?.focus()
      // Clear the request so the focus is not repeated on the next idle change.
      target.current = null
    // Close the if block.
    }
  // Dependency array: re-run the effect only when `busy` changes (for example from true back to false after the submit finishes).
  }, [busy])
  // Return a stable setter function (useCallback with []) that the form calls to REQUEST focus on a field id, e.g. after a failed submit.
  return useCallback((id) => {
    // Store the id in the ref; the effect above uses it once the form is idle.
    target.current = id
  // Empty dependency array: the function never changes (refs are stable).
  }, [])
// Close the useFocusWhenIdle function.
}