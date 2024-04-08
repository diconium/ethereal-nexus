'use client';

import React from 'react';

export type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons: Record<string, any> = {
  logo: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M12.422 3.072c-.374.355-.828.929-1.501 1.785l-.34.433a56.28 56.28 0 0 0-.067.085c-.305.39-.587.749-.983.96c-.403.215-.854.24-1.328.266l-.104.006l-.527.03c-1.046.06-1.74.103-2.223.207c-.466.1-.536.218-.566.278c-.036.072-.084.223.111.697c.199.484.567 1.11 1.118 2.042l.279.47l.052.089c.255.428.484.814.544 1.264c.06.446-.056.883-.187 1.375l-.027.101l-.143.54c-.282 1.069-.472 1.791-.535 2.321c-.064.53.028.65.065.689l.002.002c.024.026.105.115.572.061c.448-.051 1.051-.21 1.928-.451a8.035 8.035 0 0 1-.724-.664c-.34-.365-.662-.849-.573-1.474c.09-.63.539-1 .97-1.25c.414-.237.99-.462 1.651-.721l.421-.165c.213-.084.33-.13.416-.172a.441.441 0 0 0 .074-.042a.438.438 0 0 0 .04-.073c.04-.086.085-.205.165-.418l.157-.424c.248-.665.463-1.243.695-1.66c.241-.435.604-.89 1.232-.99c.623-.1 1.112.212 1.485.544c.358.321.758.799 1.22 1.351l.291.35c.148.176.232.276.3.345a.632.632 0 0 0 .069.062l.003.002l.002.001l.01.003a.604.604 0 0 0 .08.015a6.5 6.5 0 0 0 .453.033l.453.024l.615.035c.47-.413.783-.717.978-.972c.21-.274.212-.397.202-.469c-.01-.071-.041-.208-.45-.458c-.425-.26-1.068-.53-2.037-.932l-.489-.204a44.117 44.117 0 0 0-.095-.04c-.441-.182-.858-.354-1.168-.689c-.305-.329-.455-.76-.619-1.23a24.608 24.608 0 0 0-.036-.102l-.183-.522c-.362-1.032-.607-1.726-.847-2.187c-.236-.452-.363-.472-.387-.476h-.003c-.022-.005-.145-.028-.51.319Zm7.47 8.302a5.05 5.05 0 0 0 .344-.4c.344-.449.58-.966.498-1.58c-.098-.733-.592-1.195-1.155-1.539c-.536-.327-1.29-.64-2.184-1.013l-.547-.228c-.598-.249-.68-.3-.74-.363c-.064-.07-.116-.173-.34-.81l-.202-.58c-.337-.959-.617-1.757-.913-2.325c-.302-.578-.73-1.136-1.466-1.262c-.74-.126-1.326.262-1.797.71c-.464.44-.985 1.102-1.61 1.897l-.378.481c-.416.529-.497.607-.577.65c-.074.04-.166.06-.812.097l-.527.03l-.064.004c-.965.056-1.778.103-2.39.235c-.643.139-1.263.413-1.592 1.077c-.324.652-.187 1.318.067 1.935c.245.596.671 1.317 1.184 2.183l.309.522c.337.57.386.68.4.788c.015.113-.005.24-.177.894l-.158.598c-.264.996-.482 1.82-.56 2.467c-.079.66-.042 1.35.455 1.887c.511.553 1.2.61 1.846.535c.62-.072 1.41-.29 2.347-.55l.128-.035l.598-.29l.043.039a.627.627 0 0 1 .063.067l.001.002l.001.003a6.495 6.495 0 0 1 .06.539l.033.451c.052.713.097 1.33.201 1.798c.11.49.328 1.023.89 1.306c.564.283 1.122.136 1.578-.072c.434-.198.95-.535 1.545-.922l.378-.246a6.34 6.34 0 0 1 .381-.238a.578.578 0 0 1 .07-.033l.008-.003h.013c.012 0 .036.002.079.01c.095.016.22.048.443.106l.44.115c.695.18 1.297.337 1.773.389c.495.054 1.078.022 1.523-.43c.446-.453.468-1.037.405-1.53c-.06-.476-.229-1.073-.422-1.763l-.123-.437a6.52 6.52 0 0 1-.115-.44a.598.598 0 0 1-.012-.078v-.01l.003-.009a.564.564 0 0 1 .032-.07c.043-.083.11-.19.231-.383l.24-.382c.378-.6.706-1.121.896-1.559c.2-.458.338-1.02.043-1.579a1.508 1.508 0 0 0-.688-.656Zm-6.59-1.625l.011.002c-.007 0-.01-.001-.011-.002Zm.024.007a.962.962 0 0 1 .245.176c.267.238.596.629 1.105 1.238l.256.306l.054.065c.223.268.46.555.794.722c.335.168.706.187 1.053.205l.085.005l.395.02c.79.044 1.296.073 1.645.144a.998.998 0 0 1 .292.094v.004a.95.95 0 0 1-.087.274c-.14.321-.405.746-.823 1.41l-.209.333l-.045.071c-.183.29-.383.606-.436.977c-.053.37.05.73.144 1.063l.024.082l.107.382c.214.762.35 1.251.394 1.602c.02.16.015.244.008.283a1.017 1.017 0 0 1-.286-.003c-.353-.039-.846-.165-1.613-.364l-.385-.1l-.082-.022c-.336-.088-.697-.184-1.066-.125c-.37.06-.683.264-.97.453l-.071.046l-.33.214c-.657.429-1.079.7-1.398.847a.958.958 0 0 1-.275.092h-.006a.99.99 0 0 1-.1-.289c-.077-.346-.115-.85-.173-1.637l-.028-.394l-.006-.085c-.024-.345-.05-.716-.225-1.047c-.174-.33-.466-.563-.738-.78l-.067-.053l-.31-.25c-.62-.496-1.018-.817-1.262-1.08a.982.982 0 0 1-.18-.237a.966.966 0 0 1 .228-.163c.304-.175.771-.36 1.504-.647l.366-.144l.08-.03c.32-.125.67-.26.932-.527c.263-.268.393-.62.512-.94l.03-.08l.137-.369c.274-.736.45-1.205.62-1.511a.946.946 0 0 1 .161-.231ZM8.75 14.372s.002.005.002.012c-.003-.008-.003-.012-.002-.012Zm-.002.037l-.006.012c-.001 0 0-.004.006-.012Zm9.571 4.832s.001-.005.005-.011c-.002.008-.004.011-.005.01Zm.027-.034a.027.027 0 0 1 .011-.005s-.003.003-.011.005Zm-5.009-9.46c.008-.006.012-.007.012-.006l-.012.006Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  hamburger: (props: IconProps) => (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 20 20"
      focusable="false"
      aria-hidden="true"
      height="20px"
      width="20px"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        clipRule="evenodd"
        stroke="currentColor"
        strokeWidth="0px"
      ></path>
    </svg>
  ),
  component: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20px"
      width="20px"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M11.6465 1.3536L7.8536 5.14649C7.65834 5.34175 7.65834 5.65834 7.8536 5.8536L11.6465 9.64649C11.8418 9.84176 12.1584 9.84175 12.3536 9.64649L16.1465 5.8536C16.3418 5.65834 16.3418 5.34176 16.1465 5.14649L12.3536 1.3536C12.1584 1.15834 11.8418 1.15834 11.6465 1.3536Z" />
      <path d="M11.6465 14.3536L7.8536 18.1465C7.65834 18.3418 7.65834 18.6583 7.8536 18.8536L11.6465 22.6465C11.8418 22.8418 12.1584 22.8418 12.3536 22.6465L16.1465 18.8536C16.3418 18.6583 16.3418 18.3418 16.1465 18.1465L12.3536 14.3536C12.1584 14.1583 11.8418 14.1583 11.6465 14.3536Z" />
      <path d="M1.3536 11.6465L5.14654 7.8536C5.3418 7.65834 5.65838 7.65834 5.85364 7.8536L9.64649 11.6465C9.84175 11.8418 9.84175 12.1583 9.64649 12.3536L5.85364 16.1465C5.65838 16.3418 5.3418 16.3418 5.14654 16.1465L1.3536 12.3536C1.15834 12.1583 1.15834 11.8418 1.3536 11.6465Z" />
      <path d="M18.1465 7.8536L14.3536 11.6465C14.1583 11.8418 14.1583 12.1583 14.3536 12.3536L18.1465 16.1465C18.3418 16.3418 18.6584 16.3418 18.8536 16.1465L22.6465 12.3536C22.8418 12.1583 22.8418 11.8418 22.6465 11.6465L18.8536 7.8536C18.6584 7.65834 18.3418 7.65834 18.1465 7.8536Z" />
    </svg>
  ),
  deploy: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="#000000"
      height="20px"
      width="20px"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M8.95305171,17.9846747 C8.72737466,19.1334216 7.71488744,20 6.5,20 L4.5,20 C4.22385763,20 4,19.7761424 4,19.5 L4,17.5 C4,16.2851126 4.86657841,15.2726253 6.0153253,15.0469483 L6.02714614,14.7041437 C6.04713299,14.1245251 6.10682628,13.555636 6.20352226,13 L2.5,13 C2.1462677,13 1.90438878,12.6427369 2.03576165,12.3143047 L4.03576165,7.31430466 C4.11169333,7.12447547 4.29554771,7 4.5,7 L9,7 C9.02538451,7 9.05032719,7.00189166 9.07469478,7.0055417 C11.4290981,4.32146349 14.9247139,2.67696313 18.771296,2.80960389 C19.3819666,2.8306615 19.9902263,2.89709634 20.5910446,3.008359 C20.7946429,3.04606238 20.9539376,3.20535713 20.991641,3.40895537 C21.812186,7.83989855 20.1522623,12.1558183 16.9947249,14.9271075 C16.9982004,14.9509022 17,14.9752409 17,15 L17,19.5 C17,19.7044523 16.8755245,19.8883067 16.6856953,19.9642383 L11.6856953,21.9642383 C11.3572631,22.0956112 11,21.8537323 11,21.5 L11,17.7949378 C10.4368132,17.8936903 9.86739064,17.9531458 9.29585627,17.9728539 L8.95305171,17.9846747 Z M7.98749247,17.6945992 L6.30540075,16.0125075 C5.56890748,16.1079151 5,16.7375198 5,17.5 L5,19 L6.5,19 C7.26248018,19 7.8920849,18.4310925 7.98749247,17.6945992 L7.98749247,17.6945992 Z M12,17.5770127 L12,20.7614835 L16,19.1614835 L16,15.7132231 C14.8178863,16.5520811 13.4713529,17.1925443 12,17.5770127 L12,17.5770127 Z M6.42079004,12 C6.80202391,10.5414825 7.44257093,9.19144113 8.28872675,8 L4.83851648,8 L3.23851648,12 L6.42079004,12 L6.42079004,12 Z M8.69991595,16.9928092 L9.26139399,16.9734479 C9.82252402,16.9540985 10.3814387,16.8930532 10.9335157,16.7908167 C16.9701904,15.672914 20.9957193,9.95997934 20.0664857,3.93363717 C19.626205,3.86599452 19.1822172,3.82436794 18.7368337,3.80900989 C12.4850041,3.59342956 7.24213247,8.48677642 7.02655214,14.738606 L7.00719083,15.300084 L8.69991595,16.9928092 Z M14,13 C12.3431458,13 11,11.6568542 11,10 C11,8.34314575 12.3431458,7 14,7 C15.6568542,7 17,8.34314575 17,10 C17,11.6568542 15.6568542,13 14,13 Z M14,12 C15.1045695,12 16,11.1045695 16,10 C16,8.8954305 15.1045695,8 14,8 C12.8954305,8 12,8.8954305 12,10 C12,11.1045695 12.8954305,12 14,12 Z" />
    </svg>
  ),
  version: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20px"
      width="20px"
      viewBox="0 0 15 15"
      {...props}
    >
      <path d="M2.5 0C1.11929 0 0 1.11929 0 2.5C0 3.70948 0.85888 4.71836 2 4.94999V9.5C2 11.433 3.567 13 5.5 13H7.29289L6.14645 14.1464L6.85355 14.8536L9.20711 12.5L6.85355 10.1464L6.14645 10.8536L7.29289 12H5.5C4.11929 12 3 10.8807 3 9.5V4.94999C4.14112 4.71836 5 3.70948 5 2.5C5 1.11929 3.88071 0 2.5 0Z" />
      <path d="M8.85355 0.853554L8.14645 0.146446L5.79289 2.5L8.14645 4.85355L8.85355 4.14645L7.70711 3H9.5C10.8807 3 12 4.11929 12 5.5V10.05C10.8589 10.2816 10 11.2905 10 12.5C10 13.8807 11.1193 15 12.5 15C13.8807 15 15 13.8807 15 12.5C15 11.2905 14.1411 10.2816 13 10.05V5.5C13 3.567 11.433 2 9.5 2H7.70711L8.85355 0.853554Z" />
    </svg>
  ),
  crossPlatform: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800px"
      height="800px"
      viewBox="0 0 48 48"
      id="Layer_3"
      version="1.1"
      {...props}
    >
      <path d="M46.25,0H2.875H0v8v32h20v8h20v-8h8V8V0H46.25z M36,3c1.104,0,2,0.896,2,2s-0.896,2-2,2s-2-0.896-2-2  S34.896,3,36,3z M6,3h24c1.104,0,2,0.896,2,2s-0.896,2-2,2H6C4.896,7,4,6.104,4,5S4.896,3,6,3z M30,46.594c-1.104,0-2-0.896-2-2  s0.896-2,2-2s2,0.896,2,2S31.104,46.594,30,46.594z M36,40.969H24V40v-4V18.083h12V36v4V40.969z M44,36h-4V14.083H20V36H4V10h40V36z   M42,7c-1.104,0-2-0.896-2-2s0.896-2,2-2s2,0.896,2,2S43.104,7,42,7z" />
    </svg>
  ),
  realTime: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800px"
      height="800px"
      viewBox="0 0 24 24"
      {...props}
      fill={props.fill === 'black' ? 'none' : props.fill}
    >
      <path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
        stroke="#000000"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12 6V12"
        stroke="#000000"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M16.24 16.24L12 12"
        stroke="#000000"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ),
  collaboration: (props: IconProps) => (
    <svg
      height="800px"
      width="800px"
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      {...props}
    >
      <g>
        <g>
          <path
            d="M303.555,129.707C355.931,85.938,325.087,0,256.569,0c-68.419,0-99.459,85.857-46.986,129.707
			c-16.122,13.472-26.401,33.716-26.401,56.32v56.32c0,9.425,7.641,17.067,17.067,17.067h112.64c9.425,0,17.067-7.641,17.067-17.067
			v-56.32C329.956,163.422,319.677,143.179,303.555,129.707z"
          />
        </g>
      </g>
      <g>
        <g>
          <path
            d="M147.679,382.293c52.376-43.769,21.532-129.707-46.986-129.707c-68.419,0-99.459,85.858-46.986,129.707
			c-16.122,13.472-26.401,33.716-26.401,56.32v56.32c0,9.425,7.641,17.067,17.067,17.067h112.64c9.425,0,17.067-7.641,17.067-17.067
			v-56.32C174.08,416.009,163.801,395.766,147.679,382.293z"
          />
        </g>
      </g>
      <g>
        <g>
          <path
            d="M458.292,382.293c52.376-43.769,21.531-129.707-46.986-129.707c-68.419,0-99.459,85.858-46.986,129.707
			c-16.122,13.472-26.401,33.716-26.401,56.32v56.32c0,9.425,7.641,17.067,17.067,17.067h112.64c9.425,0,17.067-7.641,17.067-17.067
			v-56.32C484.693,416.009,474.415,395.766,458.292,382.293z"
          />
        </g>
      </g>
      <g>
        <g>
          <path
            d="M318.618,395.938l-45.551-45.551v-64.804c0-9.425-7.641-17.067-17.067-17.067s-17.067,7.641-17.067,17.067v64.804
			l-45.551,45.551c-6.665,6.665-6.665,17.471,0,24.136c6.664,6.665,17.471,6.665,24.136,0L256,381.591l38.482,38.482
			c6.664,6.664,17.471,6.665,24.136,0S325.283,402.603,318.618,395.938z"
          />
        </g>
      </g>
    </svg>
  ),
};
