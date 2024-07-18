/**
 * v0 by Vercel.
 * @see https://v0.dev/t/ddw5vrDuWkW
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
export default function Empty({itemsName="items", showExtraInformation=false, extraInformationText=""}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
        <BoxIcon className="w-24 h-24 text-muted" />
      <div className="text-center">
        <h3 className="text-2xl font-medium">No {itemsName} found</h3>
        {showExtraInformation && (<p className="">
            {extraInformationText}
        </p>)}
      </div>
    </div>
  )
}

function BoxIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="black"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}