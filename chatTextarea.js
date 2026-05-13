window.chatTextarea = {
    dispose: function (element) {
        if (!element || !element._chatTextareaKeydown) return;
        element.removeEventListener('keydown', element._chatTextareaKeydown);
        delete element._chatTextareaKeydown;
    },

    initialize: function (element, dotNetHelper) {
        if (!element) return;
        window.chatTextarea.dispose(element);
        this.adjustHeight(element, 1, 10);

        var handler = function (e) {
            if (e.key !== 'Enter') return;
            if (e.shiftKey) return;
            var v = element.value;
            if (v.indexOf('\n') !== -1) return;
            e.preventDefault();
            if (dotNetHelper) {
                dotNetHelper.invokeMethodAsync('SubmitPromptFromKeyboardAsync', element.value)
                    .catch(function () { });
            }
        };
        element._chatTextareaKeydown = handler;
        element.addEventListener('keydown', handler);
    },

    adjustHeight: function (element, minRows, maxRows) {
        if (!element) return minRows;

        // Reset height to auto to get the correct scrollHeight
        element.style.height = 'auto';

        // Calculate line height
        const computedStyle = window.getComputedStyle(element);
        const lineHeight = parseInt(computedStyle.lineHeight) || 20;
        const paddingTop = parseInt(computedStyle.paddingTop) || 0;
        const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;

        // Calculate required rows
        const contentHeight = element.scrollHeight - paddingTop - paddingBottom;
        const requiredRows = Math.max(minRows, Math.ceil(contentHeight / lineHeight));
        const actualRows = Math.min(requiredRows, maxRows);

        // Set the height
        const newHeight = (actualRows * lineHeight) + paddingTop + paddingBottom;
        element.style.height = newHeight + 'px';

        // Handle scrolling for max height
        if (requiredRows > maxRows) {
            element.style.overflowY = 'auto';
        } else {
            element.style.overflowY = 'hidden';
        }

        return actualRows;
    }
};
