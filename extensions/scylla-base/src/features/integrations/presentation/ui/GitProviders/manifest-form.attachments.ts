/** Posts the form of the manifest to GitHub once it is on the page: the browser leaves. */
export const postOnMount = (form: HTMLFormElement): void => {
  form.submit();
};
