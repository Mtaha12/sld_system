const AuthSupportLink = ({ action, text }) => {
  return (
    <div className="text-center mt-1 text-sm text-theme-disabled">
      {text ? text : `Getting issues ${action}?`}{' '}
      <a
        href="#"
        className="text-brand-orange hover:text-[#D44E35] underline decoration-brand-orange/50 underline-offset-4"
      >
        Contact us
      </a>
    </div>
  )
}

export default AuthSupportLink
