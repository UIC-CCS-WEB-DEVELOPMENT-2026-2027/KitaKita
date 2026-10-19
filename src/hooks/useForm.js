import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Small form helper.
//  - errors are derived from the values on every render, so they update as you type
//  - an error is only SHOWN once its field has been touched (left once) or the form was submitted
//  - serverErrors hold problems only the "server" can know (e.g. email already registered)
export function useForm(initial, validate, onEdit) {
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})

  const errors = useMemo(() => validate(values), [validate, values])

  const setValue = useCallback(
    (name, value) => {
      setValues((v) => ({ ...v, [name]: value }))
      setServerErrors((s) => (s[name] ? { ...s, [name]: '' } : s))
      if (onEdit) onEdit()
    },
    [onEdit]
  )

  const touch = useCallback((name) => {
    setTouched((t) => (t[name] ? t : { ...t, [name]: true }))
  }, [])

  const touchAll = useCallback(() => {
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])))
  }, [values])

  const setServerError = useCallback((name, message) => {
    setServerErrors((s) => ({ ...s, [name]: message }))
  }, [])

  const error = (name) => (touched[name] && errors[name]) || serverErrors[name] || ''

  // Props for a controlled text input.
  const field = (name) => ({
    value: values[name],
    onChange: (e) => setValue(name, e.target.value),
    onBlur: () => touch(name),
  })

  return { values, errors, error, field, setValue, touch, touchAll, setServerError }
}

// Inputs inside a disabled <fieldset> cannot take focus, so after a failed submit we
// wait until the form is enabled again before moving focus to the field that needs fixing.
export function useFocusWhenIdle(busy) {
  const target = useRef(null)
  useEffect(() => {
    if (!busy && target.current) {
      document.getElementById(target.current)?.focus()
      target.current = null
    }
  }, [busy])
  return useCallback((id) => {
    target.current = id
  }, [])
}
