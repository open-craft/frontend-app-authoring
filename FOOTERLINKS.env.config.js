import { PLUGIN_OPERATIONS, DIRECT_PLUGIN } from '@openedx/frontend-plugin-framework';

/**
 * Documentation link
 * https://github.com/openedx/frontend-component-footer/tree/v14.9.3/src/plugin-slots/StudioFooterHelpContentSlot
 * 
 */

const baseDomain = process.env.BASEPORTAL;
var BUTTONS = [{
  as: 'a',
  href: 'https://docs.openedx.org/en/latest/educators/quickstarts/build_a_course.html',
  size: 'sm',
  message: "edx documentation",
  dataTestid: null
}, {
  as: 'a',
  href: `${baseDomain}/portal/courses/FOO`,
  size: 'sm',
  message: "e-SHE Portal",
  dataTestid: null
}, {
  as: 'a',
  href: `${baseDomain}/help/s/article/Enrolling-in-How-to-Take-a-Course/FOO`,
  size: 'sm',
  message: "Enroll in How to Take a Course",
  dataTestid: null
}, {
  as: 'a',
  href: `${baseDomain}/help/s/article/Accessing-the-How-to-Build-in-Open-edX-Studio-Course/FOO`,
  size: 'sm',
  message: "Ask to Enroll in How to Build in Open edX",
  dataTestid: null
}];


const config = {
  pluginSlots: {
    'org.openedx.frontend.layout.studio_footer_help-content.v1': {
      keepDefault: false,
      plugins: [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'studio_footer_helpcontent_addition',
            type: DIRECT_PLUGIN,
            priority: 40,
            RenderWidget: () => {
              return (
                <div className="px-4 container-mw-xl container-fluid" data-testid="helpButtonRow">
                  <div class="pgn-transition-replace-group position-relative">
                    <div class="py-4 pgn__action-row" data-testid="helpButtonRow">
                      <span class="pgn__action-row-spacer"> </span>
                      {BUTTONS.map(({ as, href, size, message, dataTestid }) => (
                        <a class="btn btn-primary btn-sm"
                          key={message.id}
                          href={href}
                          data-testid={dataTestid}
                        >
                          {message}
                        </a>
                      ))}
                      <span class="pgn__action-row-spacer"> </span>
                    </div>
                  </div>
                </div>
              )
            }
          }
        },
      ],
    },
  },

};

export default config;

